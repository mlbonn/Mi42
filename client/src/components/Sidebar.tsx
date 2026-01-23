/**
 * FRIDAY CRM - Sidebar Navigation (Apollo.io-style)
 * Version: 3.0 - Role-Based Access Control (RBAC) integrated
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { menuVisibility, type UserRole } from "../lib/rbac";

const EMAIL_FOLDERS = ['INBOX', 'Drafts', 'Sent', 'Trash', 'Spam'];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "crm",
  ]);
  const [selectedEmailFolder, setSelectedEmailFolder] = useState('INBOX');

  const userRole = user?.role as UserRole | undefined;

  const toggleSection = (section: string) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter((s) => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const isActive = (path: string) => {
    return location === path || location.startsWith(path + "/");
  };

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href}>
      <div
        className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
          isActive(href) ? "bg-gray-100 text-gray-900 font-semibold " : "text-gray-700"
        }`}
      >
        {children}
      </div>
    </Link>
  );

  const CategoryHeader = ({ title }: { title: string }) => (
    <div className="px-4 pt-6 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      {!isCollapsed && title}
    </div>
  );

  const SectionHeader = ({ section, icon, title }: { section: string; icon: string; title: string }) => (
    <div
      onClick={() => toggleSection(section)}
      className="px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
    >
      <span>
        {icon} {!isCollapsed && title}
      </span>
      {!isCollapsed && (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {expandedSections.includes(section) ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          )}
        </svg>
      )}
    </div>
  );

  const getFolderIcon = (folder: string) => {
    const icons: { [key: string]: string } = {
      INBOX: '📥',
      Drafts: '✏️',
      Sent: '📤',
      Trash: '🗑️',
      Spam: '⚠️',
    };
    return icons[folder] || '📧';
  };

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-white flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && (
          <img src="/friday-logo.svg" alt="FRIDAY" className="h-8" />
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {isCollapsed ? "▶" : "◀"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
 
                {menuVisibility.companies(userRole) && <NavLink href="/corporations">Konzerne</NavLink>}
                {menuVisibility.companies(userRole) && <NavLink href="/companies">Firmen</NavLink>}
                {menuVisibility.contacts(userRole) && <NavLink href="/contacts">Kontakte</NavLink>}
                {menuVisibility.pipeline(userRole) && <NavLink href="/deals">Pipeline</NavLink>}
                {userRole === 'staff_plus' && <NavLink href="/my-deals">Meine Deals</NavLink>}
                <NavLink href="/calendar">Kalender</NavLink>
<div className="border-t border-gray-200 my-2"></div>  
<NavLink href="/emails?folder=INBOX" className="font-bold">📧 E-Mails</NavLink>
<button
  onClick={() => setExpandedSections(
    expandedSections.includes("emails") 
      ? expandedSections.filter(s => s !== "emails")
      : [...expandedSections, "emails"]
  )}
  className="text-xs text-gray-500 hover:text-gray-700 px-4 py-1"
>
  ⋯ Weitere Ordner
</button>
{expandedSections.includes("emails") && (
  <div className="pl-4 space-y-1">
    <Link href="/emails?folder=INBOX" className="block px-4 py-1 text-sm">📥 INBOX</Link>
    <Link href="/emails?folder=Drafts" className="block px-4 py-1 text-sm">✏️ Drafts</Link>
    <Link href="/emails?folder=Sent" className="block px-4 py-1 text-sm">📤 Sent</Link>
    <Link href="/emails?folder=Trash" className="block px-4 py-1 text-sm">🗑️ Trash</Link>
    <Link href="/emails?folder=Spam" className="block px-4 py-1 text-sm">⚠️ Spam</Link>
  </div>
)}
<div className="border-t border-gray-200 my-2"></div>

        {menuVisibility.scout(userRole) && (
          <>
            <CategoryHeader title="Agents" />
            <SectionHeader section="scout" icon="" title="Scout Agent" />
            {!isCollapsed && expandedSections.includes("scout") && (
              <div>
                <NavLink href="/scout">Dashboard</NavLink>
                <NavLink href="/scout/seed">Seed hinzufügen</NavLink>
                <NavLink href="/scout/review">Review Queue</NavLink>
                <NavLink href="/scout/queue">Job Queue</NavLink>
                <NavLink href="/scout/methods">Discovery Methods</NavLink>
                <NavLink href="/scout/stats">Statistiken</NavLink>
              </div>
            )}
          </>
        )}

        {menuVisibility.hunter(userRole) && (
          <>
            <SectionHeader section="hunter" icon="" title="Hunter Agent" />
            {!isCollapsed && expandedSections.includes("hunter") && (
              <div>
                <NavLink href="/hunter">Dashboard</NavLink>
                <NavLink href="/hunter/targets">Target Companies</NavLink>
                <NavLink href="/hunter/contacts">Gefundene Kontakte</NavLink>
                <NavLink href="/hunter/review">Review Queue</NavLink>
                <NavLink href="/hunter/sources">Datenquellen</NavLink>
                <NavLink href="/hunter/stats">Statistiken</NavLink>
              </div>
            )}
          </>
        )}

        {menuVisibility.outreach(userRole) && (
          <>
            <SectionHeader section="outreach" icon="" title="Outreach Agent" />
            {!isCollapsed && expandedSections.includes("outreach") && (
              <div>
                <NavLink href="/outreach">Dashboard</NavLink>
                <NavLink href="/outreach/campaigns">Kampagnen</NavLink>
                <NavLink href="/outreach/drafts">E-Mail Drafts</NavLink>
                <NavLink href="/outreach/review">Review Queue</NavLink>
                <NavLink href="/outreach/sent">Versendete E-Mails</NavLink>
                <NavLink href="/outreach/responses">Antworten</NavLink>
                {menuVisibility.outreachConfig(userRole) && <NavLink href="/outreach/templates">Templates</NavLink>}
                <NavLink href="/outreach/stats">Statistiken</NavLink>
              </div>
            )}
          </>
        )}


{menuVisibility.settings(userRole) && (
  <>
    <NavLink href="/system">⚙️ System</NavLink>
    <div className="pl-4 space-y-1">
      <NavLink href="/users" className="text-sm">Benutzer</NavLink>
      <NavLink href="/settings" className="text-sm">Einstellungen</NavLink>
      {/* weitere Untermenüs */}
    </div>
  </>
)}


        <NavLink href="/docs">
          Dokumentation
        </NavLink>
      </div>

      <div className="p-4">
        {!isCollapsed ? (
          <div className="text-sm">
            <div className="font-bold truncate">{user?.name || "User"}</div>
            <div className="text-xs text-gray-500">
              {userRole === 'super_admin' ? 'Super Admin' :
               userRole === 'admin' ? 'Admin' :
               userRole === 'staff' ? 'Staff' :
               userRole === 'staff_plus' ? 'Staff+' : 'User'}
            </div>
          </div>
        ) : (
          <div className="text-center text-2xl">👤</div>
        )}
      </div>
    </div>
  );
}
