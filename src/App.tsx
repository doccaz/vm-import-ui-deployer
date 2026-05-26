/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Copy, Check, Server, Download, Terminal } from "lucide-react";

const MANIFEST = `apiVersion: v1
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
        command: ["/bin/sh", "-c"]
        args:
        - |
          cat <<EOF > /tmp/kubeconfig
          apiVersion: v1
          kind: Config
          clusters:
          - name: default
            cluster:
              server: https://\${KUBERNETES_SERVICE_HOST}:\${KUBERNETES_SERVICE_PORT}
              insecure-skip-tls-verify: true
          users:
          - name: sa
            user:
              token: $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
          contexts:
          - name: default
            context:
              cluster: default
              user: sa
          current-context: default
          EOF
          export KUBECONFIG=/tmp/kubeconfig
          # Unset env vars to force backends to fallback to the generated KUBECONFIG
          unset KUBERNETES_SERVICE_HOST KUBERNETES_SERVICE_PORT
          exec /usr/local/bin/vm-import-ui
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
  type: NodePort
  selector:
    app: vm-import-ui
  ports:
  - protocol: TCP
    port: 8080
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
      - path: /vm-import-ui
        pathType: Prefix
        backend:
          service:
             name: vm-import-ui-service
             port:
               number: 8080`;

export default function App() {
  const [yamlCopied, setYamlCopied] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);

  const copyToClipboard = async (
    text: string,
    setCopiedState: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const downloadManifest = () => {
    const blob = new Blob([MANIFEST], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vm-import-ui-install.yaml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const kubectlCmd = "kubectl apply -f vm-import-ui-install.yaml";

  return (
    <div className="min-h-screen bg-app text-main font-sans selection:bg-primary selection:text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col items-center text-center space-y-4 pb-6">
          <div className="p-4 bg-primary bg-opacity-20 rounded-2xl text-primary inline-flex">
            <Server size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
              VM-Import-UI Installer
            </h1>
            <p className="text-secondary text-base max-w-xl mx-auto">
              Generate and apply the required Kubernetes configuration to deploy
              the Harvester VM Import UI onto your cluster.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Instructions Sidebar */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-main rounded-xl p-6 shadow-xl h-full flex flex-col">
              <h2 className="text-xl font-semibold text-white mb-6">
                Installation Steps
              </h2>

              <div className="space-y-8 flex-1">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">
                      Download Manifest
                    </h3>
                    <p className="text-sm text-secondary mb-3">
                      Save the deployment YAML to your local machine.
                    </p>
                    <button
                      onClick={downloadManifest}
                      className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg active:scale-95"
                    >
                      <Download size={16} />
                      <span>Download YAML</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      Apply to Cluster
                    </h3>
                    <p className="text-sm text-secondary mb-3">
                      Using kubectl, apply the downloaded manifest to your
                      cluster.
                    </p>
                    <div className="bg-app rounded-md border border-main p-3 flex justify-between items-center group mb-2">
                      <code className="text-sm text-gray-300 font-mono flex items-center gap-2 truncate pr-2">
                        <Terminal
                          size={14}
                          className="text-secondary flex-shrink-0"
                        />
                        {kubectlCmd}
                      </code>
                      <button
                        onClick={() => copyToClipboard(kubectlCmd, setCmdCopied)}
                        className="text-secondary hover:text-white flex-shrink-0 transition-colors"
                        title="Copy command"
                      >
                        {cmdCopied ? (
                          <Check size={16} className="text-primary" />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      Access the UI
                    </h3>
                    <p className="text-sm text-secondary mb-3">
                      Once deployed, you can access the UI via Ingress at <code className="bg-app px-1 py-0.5 rounded text-xs border border-main">/vm-import-ui</code> or by finding the assigned NodePort and navigating to any of your cluster's Node IPs.
                    </p>
                    <div className="bg-app rounded-md border border-main p-3 flex justify-between items-center group mb-2">
                       <code className="text-xs text-gray-300 font-mono flex items-center gap-2 truncate pr-2">
                         <Terminal size={14} className="text-secondary flex-shrink-0" />
                         kubectl -n vm-import-ui-system get ingress vm-import-ui-ingress
                       </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* YAML Viewer */}
          <div className="lg:col-span-7">
            <div className="bg-card border border-main rounded-xl p-0 shadow-xl overflow-hidden flex flex-col h-full ring-1 ring-white/5">
              <div className="flex justify-between items-center p-4 border-b border-main bg-[#13332a]">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Server size={16} className="text-primary" />
                  vm-import-ui-install.yaml
                </h2>
                <button
                  onClick={() => copyToClipboard(MANIFEST, setYamlCopied)}
                  className="flex items-center space-x-1.5 text-xs font-medium py-1 px-3 rounded transition-colors border border-main text-secondary hover:text-white bg-app/50 hover:bg-app"
                >
                  {yamlCopied ? (
                    <>
                      <Check size={14} className="text-primary" />
                      <span className="text-primary">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy YAML</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-[#0a241f] overflow-y-auto max-h-[700px]">
                <pre className="text-xs font-mono text-gray-300 leading-relaxed max-w-full overflow-x-auto">
                  <code>{MANIFEST}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              About Harvester VM Import UI
            </h2>
            <p className="text-secondary leading-relaxed text-sm">
              This installer provides an easy way to deploy the VM Import UI
              onto your Kubernetes cluster. The VM Import UI itself provides a
              user-friendly interface for migrating virtual machines into
              Harvester / SUSE Virtualization clusters. It supports two
              migration engines: the native VM Import Controller and the
              Forklift (Konveyor) project, with sources including VMware
              vCenter, standalone ESXi hosts, and OVA/OVF files on NFS shares.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Harvester Card */}
            <div className="bg-card text-main rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-main">
              <div className="mb-6 h-16 flex items-center justify-center bg-white rounded p-2">
                <img
                  src="https://harvesterhci.io/img/logo_horizontal.svg"
                  alt="Harvester"
                  className="h-12 w-auto"
                />
              </div>
              <h2 className="text-xl font-bold mb-3 text-white">Harvester</h2>
              <p className="text-secondary leading-relaxed mb-6 flex-grow text-sm">
                Harvester is a modern, open-source hyperconverged infrastructure
                (HCI) solution built on Kubernetes. It seamlessly integrates
                virtualization into cloud-native environments, providing a
                unified platform to manage both VMs and containers with
                edge-ready architecture.
              </p>
              <a
                href="https://harvesterhci.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-6 rounded-lg flex items-center transition-colors shadow"
              >
                Learn More
              </a>
            </div>

            {/* SUSE Virtualization Card */}
            <div className="bg-card text-main rounded-2xl p-8 flex flex-col items-center text-center shadow-xl border border-main">
              <div className="mb-6 h-16 flex items-center justify-center p-2">
                <img
                  src="https://d12w0ryu9hjsx8.cloudfront.net/shared-header/1.7/assets/SUSE_Logo.svg"
                  alt="SUSE"
                  className="h-12 w-auto"
                />
              </div>
              <h2 className="text-xl font-bold mb-3 text-white">
                SUSE Virtualization
              </h2>
              <p className="text-secondary leading-relaxed mb-6 flex-grow text-sm">
                Harvester is the foundation for{" "}
                <strong className="text-white">SUSE Virtualization</strong>, an
                enterprise-grade platform offering world-class support, enhanced
                security, and seamless Rancher integration for mission-critical
                workloads.
              </p>
              <a
                href="https://www.suse.com/products/virtualization"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white hover:bg-gray-200 text-[#0c322c] font-semibold py-2 px-6 rounded-lg flex items-center transition-colors shadow"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

