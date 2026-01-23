import React, { useEffect, useState } from "react";
import "./taskpane.css";
import { login, logout, getCurrentUser, getStoredUser, User } from "../api/auth";
import {
  searchContactsByEmail,
  createContact,
  updateContact,
  createActivity,
  getActivitiesByContact,
  Contact,
  Activity,
} from "../api/client";

interface EmailData {
  from: string;
  subject: string;
  body: string;
  sender: {
    displayName: string;
    emailAddress: string;
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    try {
      // Check if user is already logged in
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
        await loadEmailData();
      } else {
        // Try to get current user from server
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          await loadEmailData();
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Error initializing app:", err);
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError(null);

    const result = await login(username, password);
    
    if (result.success && result.user) {
      setUser(result.user);
      await loadEmailData();
    } else {
      setLoginError(result.error || "Login fehlgeschlagen");
    }
    
    setLoggingIn(false);
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setContact(null);
    setActivities([]);
    setEmailData(null);
  }

  async function loadEmailData() {
    try {
      setLoading(true);
      
      // Get current email item
      const item = Office.context.mailbox.item;
      
      if (!item) {
        setError("Keine E-Mail ausgewählt");
        setLoading(false);
        return;
      }

      // Extract email data
      const from = item.from?.emailAddress || "";
      const subject = item.subject || "";
      
      // Get body
      item.body.getAsync(Office.CoercionType.Text, async (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          const emailData: EmailData = {
            from,
            subject,
            body: result.value,
            sender: {
              displayName: item.from?.displayName || "",
              emailAddress: item.from?.emailAddress || "",
            },
          };
          
          setEmailData(emailData);
          
          // Search for contact in FRIDAY
          await searchContact(from);
          
          // Log email activity
          await logEmailActivity(emailData);
        } else {
          setError("Fehler beim Laden der E-Mail");
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("Error loading email:", err);
      setError("Fehler beim Laden der E-Mail");
      setLoading(false);
    }
  }

  async function searchContact(email: string) {
    try {
      const contacts = await searchContactsByEmail(email);
      
      if (contacts && contacts.length > 0) {
        setContact(contacts[0]);
        
        // Load activities for this contact
        const contactActivities = await getActivitiesByContact(contacts[0].id);
        if (contactActivities) {
          setActivities(contactActivities);
        }
      } else {
        setContact(null);
        setActivities([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error searching contact:", err);
      setLoading(false);
    }
  }

  async function logEmailActivity(emailData: EmailData) {
    if (!contact) return;

    try {
      await createActivity({
        type: "email",
        subject: `E-Mail: ${emailData.subject}`,
        description: emailData.body.substring(0, 500),
        contactId: contact.id,
        companyId: contact.companies?.[0]?.id,
      });
    } catch (err) {
      console.error("Error logging email activity:", err);
    }
  }

  async function handleCreateContact() {
    if (!emailData) return;

    try {
      setLoading(true);
      
      // Parse name from display name
      const nameParts = emailData.sender.displayName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const newContact = await createContact({
        firstName,
        lastName,
        email: emailData.from,
      });

      if (newContact) {
        setContact(newContact);
        alert("Kontakt erfolgreich erstellt!");
      } else {
        alert("Fehler beim Erstellen des Kontakts");
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error creating contact:", err);
      alert("Fehler beim Erstellen des Kontakts");
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!contact) return;

    const note = prompt("Notiz hinzufügen:");
    if (!note) return;

    try {
      await createActivity({
        type: "note",
        subject: "Notiz",
        description: note,
        contactId: contact.id,
        companyId: contact.companies?.[0]?.id,
      });

      // Reload activities
      const contactActivities = await getActivitiesByContact(contact.id);
      if (contactActivities) {
        setActivities(contactActivities);
      }

      alert("Notiz hinzugefügt!");
    } catch (err) {
      console.error("Error adding note:", err);
      alert("Fehler beim Hinzufügen der Notiz");
    }
  }

  // Login screen
  if (!user) {
    return (
      <div className="container">
        <div className="header">
          <h1>FRIDAY CRM</h1>
        </div>
        <div className="section">
          <h2>🔐 Anmeldung</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Benutzername:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                disabled={loggingIn}
              />
            </div>
            <div className="form-group">
              <label>Passwort:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loggingIn}
              />
            </div>
            {loginError && (
              <div className="error">
                <p>⚠️ {loginError}</p>
              </div>
            )}
            <button 
              type="submit" 
              className="btn btn-primary btn-block"
              disabled={loggingIn}
            >
              {loggingIn ? "Anmelden..." : "Anmelden"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Lade Daten...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">
          <p>⚠️ {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <h1>FRIDAY CRM</h1>
        <div className="user-info">
          <span>{user.name || user.username}</span>
          <button className="btn-link" onClick={handleLogout}>
            Abmelden
          </button>
        </div>
      </div>

      {/* Email Info */}
      {emailData && (
        <div className="section">
          <h2>📧 Aktuelle E-Mail</h2>
          <div className="info-box">
            <p className="label">Von:</p>
            <p className="value">{emailData.sender.displayName || emailData.from}</p>
            <p className="label">Betreff:</p>
            <p className="value">{emailData.subject}</p>
          </div>
        </div>
      )}

      {/* Contact Info */}
      {contact ? (
        <div className="section">
          <h2>👤 Kontakt</h2>
          <div className="info-box">
            <h3>
              {contact.firstName} {contact.lastName}
            </h3>
            {contact.position && <p className="position">{contact.position}</p>}
            {contact.companies && contact.companies.length > 0 && (
              <p className="company">{contact.companies[0].name}</p>
            )}
            <p className="contact-detail">📧 {contact.email}</p>
            {contact.phone && <p className="contact-detail">📞 {contact.phone}</p>}
            {contact.phoneMobile && (
              <p className="contact-detail">📱 {contact.phoneMobile}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="section">
          <h2>⚠️ Kontakt nicht gefunden</h2>
          <div className="info-box">
            <p>Dieser Kontakt existiert noch nicht in FRIDAY CRM.</p>
            <button className="btn btn-primary" onClick={handleCreateContact}>
              Kontakt erstellen
            </button>
          </div>
        </div>
      )}

      {/* Company Info */}
      {contact?.companies && contact.companies.length > 0 && (
        <div className="section">
          <h2>🏢 Firma</h2>
          <div className="info-box">
            <h3>{contact.companies[0].name}</h3>
          </div>
        </div>
      )}

      {/* Email History */}
      <div className="section">
        <h2>📧 Aktivitäten ({activities.length})</h2>
        <div className="info-box">
          {activities.length > 0 ? (
            <div className="activities-list">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="activity-item">
                  <p className="activity-type">{activity.type}</p>
                  <p className="activity-subject">{activity.subject}</p>
                  <p className="activity-date">
                    {new Date(activity.date).toLocaleDateString("de-DE")}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">Keine Aktivitäten gefunden</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {contact && (
        <div className="section">
          <h2>⚡ Aktionen</h2>
          <div className="actions">
            <button className="btn btn-secondary btn-block" onClick={handleAddNote}>
              📝 Notiz hinzufügen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
