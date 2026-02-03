import { motion } from 'framer-motion';
import NotificationSettings from '@/components/dashboard/NotificationSettings';
import GoogleSheetsSettings from '@/components/dashboard/GoogleSheetsSettings';
import { EbaySyncSettings } from '@/components/dashboard/EbaySyncSettings';

export default function DashboardSettings() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, notifications, and integrations
        </p>
      </motion.div>

      {/* eBay Sync Configuration */}
      <EbaySyncSettings />

      {/* Google Sheets Integration */}
      <GoogleSheetsSettings />

      {/* Notification Settings */}
      <NotificationSettings />
    </div>
  );
}
