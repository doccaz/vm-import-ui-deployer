import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import * as k8s from '@kubernetes/client-node';
import * as yaml from 'js-yaml';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const MANIFEST = `
apiVersion: v1
kind: Namespace
metadata:
  name: vm-import-ui-system
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: vm-import-ui-sa
  namespace: vm-import-ui-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vm-import-ui-role
rules:
- apiGroups: ["migration.harvesterhci.io"]
  resources: ["virtualmachineimports", "virtualmachineimports/status", "vmwaresources"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: ["network.harvesterhci.io"]
  resources: ["vlanconfigs"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["storage.k8s.io"]
  resources: ["storageclasses"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["kubevirt.io"]
  resources: ["virtualmachines"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["namespaces", "secrets"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["management.cattle.io"]
  resources: ["projects"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vm-import-ui-rb
subjects:
- kind: ServiceAccount
  name: vm-import-ui-sa
  namespace: vm-import-ui-system
roleRef:
  kind: ClusterRole
  name: vm-import-ui-role
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vm-import-ui-controller
  namespace: vm-import-ui-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vm-import-ui
  template:
    metadata:
      labels:
        app: vm-import-ui
    spec:
      serviceAccountName: vm-import-ui-sa
      containers:
      - name: vm-import-ui
        image: ghcr.io/doccaz/vm-import-ui:latest
        ports:
        - containerPort: 8080
        env:
        - name: USE_MOCK_DATA
          value: "false"
        - name: LOG_LEVEL
          value: "info"
---
apiVersion: v1
kind: Service
metadata:
  name: vm-import-ui-service
  namespace: vm-import-ui-system
spec:
  selector:
    app: vm-import-ui
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vm-import-ui-ingress
  namespace: vm-import-ui-system
  annotations:
    "harvesterhci.io/ui-source": "internal"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: vm-import-ui-service
            port:
              number: 80
`;

app.post('/api/deploy', async (req, res) => {
  try {
    const { kubeconfig } = req.body;
    if (!kubeconfig) {
      return res.status(400).json({ error: 'Kubeconfig is required' });
    }

    const kc = new k8s.KubeConfig();
    kc.loadFromString(kubeconfig);

    const client = k8s.KubernetesObjectApi.makeApiClient(kc);
    const manifests = yaml.loadAll(MANIFEST) as any[];

    const results = [];
    for (const spec of manifests) {
      if (!spec || !spec.kind || !spec.metadata) continue;

      try {
        await client.read(spec);
        // Exists, attempt to patch
        spec.metadata.annotations = spec.metadata.annotations || {};
        spec.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'] = JSON.stringify(spec);
        await client.patch(spec, 'true', undefined, undefined, undefined, {
            headers: { 'Content-type': 'application/merge-patch+json'}
        });
        results.push({ kind: spec.kind, name: spec.metadata.name, status: 'updated' });
      } catch (e: any) {
        if (e && e.response && e.response.statusCode === 404) {
          // Does not exist, create
          await client.create(spec);
          results.push({ kind: spec.kind, name: spec.metadata.name, status: 'created' });
        } else {
          try {
             // Fallback to create if read fails and it's some other reason
             await client.create(spec);
             results.push({ kind: spec.kind, name: spec.metadata.name, status: 'created (fallback)' });
          } catch(err: any) {
             console.error(`Error handling ${spec.kind} ${spec.metadata.name}:`, err.body || err);
             throw new Error(`Failed to create or update ${spec.kind} ${spec.metadata.name}: ${JSON.stringify(err.body || err.message)}`);
          }
        }
      }
    }

    res.json({ success: true, message: 'Deployment successful', details: results });
  } catch (error: any) {
    console.error('Deployment error:', error);
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
