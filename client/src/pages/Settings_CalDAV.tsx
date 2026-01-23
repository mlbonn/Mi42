import React, { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc';

export default function Settings() {
  const [caldavEmail, setCaldavEmail] = useState('');
  const [caldavPassword, setCaldavPassword] = useState('');
  const [caldavEnabled, setCaldavEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Fetch current credentials
  const { data: credentials } = trpc.userSettings.getCalDAVCredentials.useQuery();

  useEffect(() => {
    if (credentials) {
      setCaldavEmail(credentials.caldavEmail || '');
      setCaldavPassword(credentials.caldavPassword || '');
      setCaldavEnabled(credentials.caldavEnabled || false);
    }
  }, [credentials]);

  // Save credentials mutation
  const saveCredentialsMutation = trpc.userSettings.saveCalDAVCredentials.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Credentials saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    },
  });

  // Test connection mutation
  const testConnectionMutation = trpc.userSettings.testCalDAVConnection.useMutation({
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Connection test successful!' });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (error) => {
      setMessage({ type: 'error', text: `Connection test failed: ${error.message}` });
    },
  });

  const handleSave = async () => {
    if (!caldavEmail || !caldavPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setLoading(true);
    try {
      await saveCredentialsMutation.mutateAsync({
        caldavEmail,
        caldavPassword,
        caldavEnabled,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!caldavEmail || !caldavPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    setTestLoading(true);
    try {
      await testConnectionMutation.mutateAsync({
        caldavEmail,
        caldavPassword,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {/* Message Alert */}
      {message && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* CalDAV/EAS Credentials Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">📧 Calendar & Email Sync</h2>
        <p className="text-gray-600 mb-6">
          Enter your SmarterMail credentials to enable calendar and email synchronization.
        </p>

        <div className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={caldavEmail}
              onChange={(e) => setCaldavEmail(e.target.value)}
              placeholder="e.g., testFRIDAY1@bl2020.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your SmarterMail email address (e.g., testFRIDAY1@bl2020.com)
            </p>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={caldavPassword}
              onChange={(e) => setCaldavPassword(e.target.value)}
              placeholder="Enter your SmarterMail password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your SmarterMail password (stored encrypted)
            </p>
          </div>

          {/* Enable Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="caldavEnabled"
              checked={caldavEnabled}
              onChange={(e) => setCaldavEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="caldavEnabled" className="ml-2 text-sm font-medium text-gray-700">
              Enable Calendar & Email Sync
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleTestConnection}
              disabled={testLoading || !caldavEmail || !caldavPassword}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {testLoading ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">ℹ️ How it works</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>✓ Your credentials are encrypted and stored securely</li>
          <li>✓ Calendar events will sync automatically</li>
          <li>✓ Emails will be available in the Email Client</li>
          <li>✓ You only need to log in to FRIDAY CRM</li>
        </ul>
      </div>
    </div>
  );
}
