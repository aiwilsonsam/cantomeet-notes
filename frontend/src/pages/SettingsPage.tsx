import { useState } from 'react';
import {
  Power,
  Check,
  RefreshCw,
  Cpu,
  Globe,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  FileText,
  MessageSquare,
  Database,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/services/api/settings';
import { Integration, MeetingTemplate } from '@/types';
import toast from 'react-hot-toast';

const SettingsTab = ({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const ModelOption = ({
  name,
  description,
  active,
}: {
  name: string;
  description: string;
  active?: boolean;
}) => (
  <div
    className={`p-4 rounded-lg border cursor-pointer transition-all ${
      active ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:border-primary-300'
    }`}
  >
    <div className="flex justify-between items-start">
      <span className="font-semibold text-slate-900 text-sm">{name}</span>
      {active && <Check size={16} className="text-primary-600" />}
    </div>
    <p className="text-xs text-slate-500 mt-1">{description}</p>
  </div>
);

export const SettingsPage = () => {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'integrations' | 'ai' | 'templates'>(
    'integrations'
  );
  const [editingIntegrationId, setEditingIntegrationId] = useState<string | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', endpoint: '', key: '', model: '' });
  const [customProviders, setCustomProviders] = useState<{ name: string; model: string }[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null);
  const [newSectionInput, setNewSectionInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Strategic', 'Engineering', 'Budget', 'Sales', 'Internal', 'External']);
  const [newTag, setNewTag] = useState('');

  const { data: integrations = [] } = useQuery<Integration[]>({
    queryKey: ['integrations', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? settingsApi.getIntegrations(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  const { data: templates = [] } = useQuery<MeetingTemplate[]>({
    queryKey: ['templates', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? settingsApi.getTemplates(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  const connectIntegrationMutation = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: Record<string, string> }) => {
      if (!activeWorkspace) throw new Error('No active workspace');
      return settingsApi.connectIntegration(activeWorkspace.id, id, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', activeWorkspace?.id] });
      toast.success('Integration connected successfully!');
      setEditingIntegrationId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to connect integration');
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: MeetingTemplate) => {
      if (!activeWorkspace) throw new Error('No active workspace');
      return settingsApi.saveTemplate(activeWorkspace.id, template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeWorkspace?.id] });
      toast.success('Template saved successfully!');
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save template');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!activeWorkspace) throw new Error('No active workspace');
      return settingsApi.deleteTemplate(activeWorkspace.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeWorkspace?.id] });
      toast.success('Template deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  const handleConnectClick = (id: string) => {
    const integration = integrations.find((i) => i.id === id);
    if (integration?.connected) {
      // TODO: Implement disconnect
      toast('Disconnect functionality coming soon', { icon: 'ℹ️' });
    } else {
      setEditingIntegrationId(id);
    }
  };

  const saveIntegrationConfig = () => {
    if (editingIntegrationId) {
      // TODO: Get config values from form
      connectIntegrationMutation.mutate({ id: editingIntegrationId, config: {} });
    }
  };

  const addProvider = () => {
    if (newProvider.name && newProvider.model) {
      setCustomProviders([...customProviders, { name: newProvider.name, model: newProvider.model }]);
      setNewProvider({ name: '', endpoint: '', key: '', model: '' });
      setIsAddingProvider(false);
      toast.success('Custom provider added');
    }
  };

  const openNewTemplateModal = () => {
    setEditingTemplate({
      id: `t_${Date.now()}`,
      name: '',
      description: '',
      structure: ['Executive Summary', 'Key Decisions', 'Action Items'],
      type: 'standard',
    });
    setNewSectionInput('');
  };

  const openEditTemplateModal = (template: MeetingTemplate) => {
    setEditingTemplate({ ...template });
    setNewSectionInput('');
  };

  const saveTemplate = () => {
    if (editingTemplate && editingTemplate.name) {
      saveTemplateMutation.mutate(editingTemplate);
    }
  };

  const deleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const addSection = () => {
    if (newSectionInput.trim() && editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        structure: [...editingTemplate.structure, newSectionInput.trim()],
      });
      setNewSectionInput('');
    }
  };

  const updateSection = (index: number, newValue: string) => {
    if (editingTemplate) {
      const newStructure = [...editingTemplate.structure];
      newStructure[index] = newValue;
      setEditingTemplate({ ...editingTemplate, structure: newStructure });
    }
  };

  const removeSection = (index: number) => {
    if (editingTemplate) {
      const newStructure = [...editingTemplate.structure];
      newStructure.splice(index, 1);
      setEditingTemplate({ ...editingTemplate, structure: newStructure });
    }
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!editingTemplate) return;
    const newStructure = [...editingTemplate.structure];
    if (direction === 'up' && index > 0) {
      [newStructure[index], newStructure[index - 1]] = [newStructure[index - 1], newStructure[index]];
    } else if (direction === 'down' && index < newStructure.length - 1) {
      [newStructure[index], newStructure[index + 1]] = [newStructure[index + 1], newStructure[index]];
    }
    setEditingTemplate({ ...editingTemplate, structure: newStructure });
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const deleteTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'digest':
        return <MessageSquare size={16} />;
      case 'crm':
        return <Database size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden relative">
      <div className="flex h-full">
        {/* Settings Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 pt-8 px-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-900 px-4 mb-6">Settings</h2>
          <nav className="space-y-1">
            <SettingsTab
              label="Integrations"
              active={activeTab === 'integrations'}
              onClick={() => setActiveTab('integrations')}
              icon={<RefreshCw size={18} />}
            />
            <SettingsTab
              label="AI & Models"
              active={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
              icon={<Cpu size={18} />}
            />
            <SettingsTab
              label="Templates & Tags"
              active={activeTab === 'templates'}
              onClick={() => setActiveTab('templates')}
              icon={<Edit2 size={18} />}
            />
            <SettingsTab
              label="General"
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={<Globe size={18} />}
            />
            <SettingsTab label="Security" active={false} onClick={() => {}} icon={<Lock size={18} />} />
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {/* INTEGRATIONS TAB */}
          {activeTab === 'integrations' && (
            <div className="max-w-3xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Connected Apps</h3>
              <p className="text-slate-500 mb-6">Manage data synchronization with your third-party tools.</p>

              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="bg-white p-6 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 p-2">
                        <img src={integration.icon} alt={integration.name} className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{integration.name}</h4>
                        <p className="text-sm text-slate-500">
                          {integration.connected
                            ? `Connected • Synced ${integration.lastSynced || 'just now'}`
                            : 'Not connected'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleConnectClick(integration.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        integration.connected
                          ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {integration.connected ? (
                        <>
                          <Check size={16} /> Connected
                        </>
                      ) : (
                        <>
                          <Power size={16} /> Connect
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI TAB */}
          {activeTab === 'ai' && (
            <div className="max-w-3xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">AI Model Configuration</h3>
              <p className="text-slate-500 mb-6">Customize how CantoMeet processes your transcripts.</p>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="font-semibold text-slate-800 mb-4">Transcription Engine</h4>
                <div className="grid grid-cols-2 gap-4">
                  <ModelOption
                    name="OpenAI Whisper v3"
                    description="Best for multi-language mixing (Cantonese/English)"
                    active
                  />
                  <ModelOption name="Google Chirp (USM)" description="High accuracy for regional dialects" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                <h4 className="font-semibold text-slate-800 mb-4">Summarization Model</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <ModelOption name="GPT-4o" description="Highest reasoning capability" active />
                  <ModelOption name="Claude 3.5 Sonnet" description="Natural, human-like writing" />
                </div>

                {customProviders.map((cp, idx) => (
                  <div key={idx} className="p-4 rounded-lg border border-slate-200 flex justify-between items-center mb-2">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">{cp.name}</span>
                      <span className="text-xs text-slate-500 ml-2">({cp.model})</span>
                    </div>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">Custom</span>
                  </div>
                ))}

                {isAddingProvider ? (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h5 className="text-sm font-bold text-slate-700 mb-3">Add Custom Provider</h5>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <input
                        type="text"
                        placeholder="Provider Name"
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        value={newProvider.name}
                        onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Model ID"
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        value={newProvider.model}
                        onChange={(e) => setNewProvider({ ...newProvider, model: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Base URL"
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        value={newProvider.endpoint}
                        onChange={(e) => setNewProvider({ ...newProvider, endpoint: e.target.value })}
                      />
                      <input
                        type="password"
                        placeholder="API Key"
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        value={newProvider.key}
                        onChange={(e) => setNewProvider({ ...newProvider, key: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addProvider}
                        className="px-3 py-2 bg-primary-600 text-white rounded-lg text-xs"
                      >
                        Save Provider
                      </button>
                      <button
                        onClick={() => setIsAddingProvider(false)}
                        className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingProvider(true)}
                    className="mt-2 text-sm text-primary-600 font-medium flex items-center gap-2 hover:text-primary-700"
                  >
                    <Plus size={16} /> Add Custom LLM Provider
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TEMPLATES TAB */}
          {activeTab === 'templates' && (
            <div className="max-w-3xl">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Templates & Tags</h3>
              <p className="text-slate-500 mb-6">Standardize your meeting records.</p>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-slate-800">Meeting Templates</h4>
                  <button
                    onClick={openNewTemplateModal}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={16} /> New Template
                  </button>
                </div>

                <div className="space-y-3">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            t.type === 'digest'
                              ? 'bg-indigo-50 text-indigo-500'
                              : t.type === 'crm'
                                ? 'bg-orange-50 text-orange-500'
                                : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {getTemplateIcon(t.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{t.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${
                                t.type === 'digest'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : t.type === 'crm'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {t.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">{t.description}</span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-400">{t.structure.length} sections</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditTemplateModal(t)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTemplate(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-semibold text-slate-800 mb-4">Global Tags</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                    >
                      {tag}
                      <button onClick={() => deleteTag(tag)} className="hover:text-red-500">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 max-w-xs">
                  <input
                    type="text"
                    placeholder="Add new tag..."
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  />
                  <button
                    onClick={addTag}
                    className="bg-slate-800 text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Globe size={48} className="mb-4 opacity-20" />
              <p>General settings coming soon...</p>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Modal for Integrations */}
      {editingIntegrationId && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Configure {integrations.find((i) => i.id === editingIntegrationId)?.name}
              </h3>
              <button
                onClick={() => setEditingIntegrationId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {integrations
                .find((i) => i.id === editingIntegrationId)
                ?.configFields?.map((field, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                      placeholder={`Enter ${field.label}`}
                    />
                  </div>
                ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingIntegrationId(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveIntegrationConfig}
                className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-medium flex items-center gap-2"
              >
                <Save size={16} /> Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      {editingTemplate && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTemplate.name ? 'Edit Template' : 'New Template'}
              </h3>
              <button onClick={() => setEditingTemplate(null)}>
                <X size={20} className="text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto pr-2 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Template Name
                </label>
                <input
                  type="text"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="e.g., Weekly Sync"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Template Type
                  </label>
                  <select
                    value={editingTemplate.type}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, type: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                  >
                    <option value="standard">Standard Document</option>
                    <option value="digest">Slack/Lark Digest</option>
                    <option value="crm">CRM Field Mapping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.description}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="Brief description..."
                  />
                </div>
              </div>

              {editingTemplate.type === 'digest' && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-start gap-3">
                  <MessageSquare className="text-indigo-500 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-indigo-800 mb-1">Lite Digest Mode</h4>
                    <p className="text-xs text-indigo-600">
                      Sections will be formatted as a concise, copy-paste friendly list optimized for team chat apps.
                    </p>
                  </div>
                </div>
              )}

              {editingTemplate.type === 'crm' && (
                <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 flex items-start gap-3">
                  <Database className="text-orange-500 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-orange-800 mb-1">CRM Data Mode</h4>
                    <p className="text-xs text-orange-600">
                      Sections act as data keys. The AI will extract structured data to map directly to your CRM fields.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  {editingTemplate.type === 'crm' ? 'CRM Fields' : 'Sections'}
                </label>

                {editingTemplate.type === 'digest' && editingTemplate.structure.length > 0 && (
                  <div className="mb-4 bg-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 border border-slate-700 shadow-inner">
                    <div className="text-slate-500 mb-2 select-none border-b border-slate-700 pb-1">
                      Slack Preview
                    </div>
                    <div className="space-y-1">
                      <div>
                        <strong>{editingTemplate.name || 'Meeting'}</strong> - {new Date().toLocaleDateString()}
                      </div>
                      <div className="h-2"></div>
                      {editingTemplate.structure.map((s, i) => (
                        <div key={i}>{s}: [Content]</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 mb-3">
                  {editingTemplate.structure.map((section, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 group">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSection(idx, 'up')}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          onClick={() => moveSection(idx, 'down')}
                          disabled={idx === editingTemplate.structure.length - 1}
                          className="text-slate-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>

                      {editingTemplate.type === 'crm' && <Database size={14} className="text-orange-400" />}

                      <input
                        type="text"
                        value={section}
                        onChange={(e) => updateSection(idx, e.target.value)}
                        className="flex-1 bg-transparent border-none text-sm text-slate-700 font-medium focus:ring-0 px-2 outline-none border-b border-transparent focus:border-primary-300"
                        placeholder={editingTemplate.type === 'crm' ? 'Field Name (e.g. Deal Amount)' : 'Section Name'}
                      />

                      <button
                        onClick={() => removeSection(idx)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {editingTemplate.structure.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                      No sections defined. Add one below.
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSectionInput}
                    onChange={(e) => setNewSectionInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSection()}
                    placeholder={
                      editingTemplate.type === 'crm' ? 'Add CRM Field (e.g., Next Steps)' : 'Add new section (e.g., Decisions)'
                    }
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                  <button
                    onClick={addSection}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={!editingTemplate.name || saveTemplateMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Save size={16} /> {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
