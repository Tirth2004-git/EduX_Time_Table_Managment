import { useState, useEffect } from 'react';
import { X, Building2, Globe, Mail, Phone, User, Upload, Loader2 } from 'lucide-react';
import eventApi from '@/services/api/eventApi';

export default function OrganizationModal({ isOpen, onClose, onSaved, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    description: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    isActive: true,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        website: initialData.website || '',
        description: initialData.description || '',
        contactPerson: initialData.contactPerson || '',
        contactEmail: initialData.contactEmail || '',
        contactPhone: initialData.contactPhone || '',
        isActive: initialData.isActive !== false,
      });
      setLogoPreview(initialData.logoUrl || '');
    } else {
      setFormData({
        name: '',
        website: '',
        description: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        isActive: true,
      });
      setLogoPreview('');
    }
    setLogoFile(null);
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Organization name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      data.append('name', formData.name.trim());
      data.append('website', formData.website.trim());
      data.append('description', formData.description.trim());
      data.append('contactPerson', formData.contactPerson.trim());
      data.append('contactEmail', formData.contactEmail.trim());
      data.append('contactPhone', formData.contactPhone.trim());
      data.append('isActive', formData.isActive);

      if (logoFile) {
        data.append('logo', logoFile);
      }

      if (initialData?._id) {
        await eventApi.updateOrganization(initialData._id, data);
      } else {
        await eventApi.createOrganization(data);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {initialData ? 'Edit Organization' : 'Add External Organization'}
              </h3>
              <p className="text-xs text-slate-500">Partner company, institution, or organizer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors border-0 bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* Logo Upload */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 className="w-7 h-7 text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Organization Logo
              </label>
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                Upload Logo Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, SVG up to 5MB</p>
            </div>
          </div>

          {/* Organization Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Zignuts Technolab, IEEE Student Branch"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Website */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
              Website URL
            </label>
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
              Short Description / About
            </label>
            <textarea
              rows={2}
              placeholder="Brief description of the partner organization..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Contact Person
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  placeholder="Coordinator"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Contact Email
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="email"
                  placeholder="contact@org.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  placeholder="+91 98765..."
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActiveOrg"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="isActiveOrg" className="text-sm font-semibold text-slate-700 cursor-pointer">
              Active Organization (available in event selection)
            </label>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer border-0"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'Update Organization' : 'Save Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
