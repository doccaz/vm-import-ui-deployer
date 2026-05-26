/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, Loader, Server, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [kubeconfig, setKubeconfig] = useState('');
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  const handleDeploy = async () => {
    if (!kubeconfig.trim()) return;
    setStatus('deploying');
    setErrorMessage('');
    setLogs([]);

    try {
      const resp = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kubeconfig })
      });

      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to deploy to Kubernetes cluster');
      }

      setLogs(data.details || []);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'An unknown error occurred.');
    }
  };

  const loadExample = () => {
    setKubeconfig(`apiVersion: v1
clusters:
- cluster:
    certificate-authority-data: LS0t...
    server: https://192.168.0.1:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
kind: Config
preferences: {}
users:
- name: default
  user:
    client-certificate-data: LS0t...
    client-key-data: LS0t...`);
  };

  return (
    <div className="min-h-screen bg-app text-main font-sans selection:bg-primary selection:text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center space-x-4 border-b border-main pb-6">
          <div className="p-3 bg-primary bg-opacity-20 rounded-xl text-primary">
            <Server size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">VM-Import-UI Installer</h1>
            <p className="text-secondary text-sm">Deploy the Harvester VM Import UI onto your Kubernetes cluster</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-card border border-main rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">Cluster Configuration</h2>
                <button 
                  onClick={loadExample}
                  className="text-xs text-secondary hover:text-primary transition-colors"
                >
                  Load Example Format
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="kubeconfig" className="block text-sm font-medium text-secondary mb-2">
                    Paste your <code className="font-mono bg-app px-1.5 py-0.5 rounded text-xs">kubeconfig</code> YAML
                  </label>
                  <textarea
                    id="kubeconfig"
                    value={kubeconfig}
                    onChange={(e) => setKubeconfig(e.target.value)}
                    className="w-full h-80 font-mono text-sm p-4 rounded-lg bg-app border-main focus:ring-1 focus:ring-primary focus:border-primary text-gray-300 resize-y shadow-inner"
                    placeholder="apiVersion: v1
clusters:
..."
                    spellCheck="false"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleDeploy}
                    disabled={!kubeconfig.trim() || status === 'deploying'}
                    className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'deploying' ? (
                      <Loader size={18} className="animate-spin text-white" />
                    ) : (
                      <Play size={18} className="text-white" />
                    )}
                    <span>{status === 'deploying' ? 'Deploying...' : 'Deploy to Cluster'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-card border border-main rounded-xl p-6 shadow-xl h-full flex flex-col">
              <h2 className="text-lg font-semibold text-white mb-4">Deployment Status</h2>
              
              {status === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-secondary border-2 border-dashed border-main rounded-lg p-6 opacity-80">
                  <Server size={32} className="mb-3 opacity-50" />
                  <p className="text-sm">Ready to deploy. Paste your kubeconfig and click deploy.</p>
                </div>
              )}

              {status === 'deploying' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <Loader size={40} className="animate-spin text-primary" />
                  <div className="space-y-1">
                    <p className="font-medium text-white">Applying manifests...</p>
                    <p className="text-xs text-secondary">Creating namespace, RBAC, deployment, and service.</p>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertTriangle size={20} />
                    <h3 className="font-semibold">Deployment Failed</h3>
                  </div>
                  <p className="text-sm text-red-200/80 font-mono bg-red-900/20 p-2 rounded max-h-40 overflow-y-auto">
                    {errorMessage}
                  </p>
                </motion.div>
              )}

              {status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                    <div className="flex items-center space-x-2 text-primary">
                      <CheckCircle2 size={24} />
                      <h3 className="font-semibold text-lg">Successfully Deployed!</h3>
                    </div>
                    <p className="text-sm text-secondary ml-8">
                      VM-Import-UI has been installed on the cluster.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider mb-2">Resource Logs</h4>
                    <div className="bg-app border border-main rounded-lg p-3 max-h-56 overflow-y-auto space-y-2 shadow-inner">
                      {logs.map((log, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-mono">
                          <span className="text-gray-300 truncate pr-2">{log.kind}/{log.name}</span>
                          <span className={`px-2 py-0.5 rounded-full ${log.status.includes('created') ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

          </div>
        </div>
        <div className="mt-16 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">About Harvester VM Import UI</h2>
            <p className="text-secondary leading-relaxed text-sm">
              This installer provides an easy way to deploy the VM Import UI onto your Kubernetes cluster. The VM Import UI itself provides a user-friendly interface for migrating virtual machines into Harvester / SUSE Virtualization clusters. It supports two migration engines: the native VM Import Controller and the Forklift (Konveyor) project, with sources including VMware vCenter, standalone ESXi hosts, and OVA/OVF files on NFS shares.
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
                Harvester is a modern, open-source hyperconverged infrastructure (HCI) solution built on Kubernetes. It seamlessly integrates virtualization into cloud-native environments, providing a unified platform to manage both VMs and containers with edge-ready architecture.
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
              <h2 className="text-xl font-bold mb-3 text-white">SUSE Virtualization</h2>
              <p className="text-secondary leading-relaxed mb-6 flex-grow text-sm">
                Harvester is the foundation for <strong className="text-white">SUSE Virtualization</strong>, an enterprise-grade platform offering world-class support, enhanced security, and seamless Rancher integration for mission-critical workloads.
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
