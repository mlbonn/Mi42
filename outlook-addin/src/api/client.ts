const API_BASE_URL = "https://46.224.13.250";

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  phone?: string;
  phoneMobile?: string;
  department?: string;
  companies?: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
  }>;
}

export interface Company {
  id: string;
  name: string;
  city?: string;
  country?: string;
  website?: string;
  products?: string;
  corporationId?: string;
  corporationName?: string;
}

export interface Corporation {
  id: string;
  name: string;
  status?: string;
  priority?: string;
  revenue?: number;
  country?: string;
}

export interface Activity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  date: Date;
  contactId?: string;
  companyId?: string;
  corporationId?: string;
  userId: string;
}

async function trpcCall<T>(procedure: string, input?: any): Promise<T | null> {
  try {
    const url = input 
      ? `${API_BASE_URL}/api/trpc/${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: input } }))}`
      : `${API_BASE_URL}/api/trpc/${procedure}?batch=1`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      console.error(`TRPC call failed: ${procedure}`, response.status);
      return null;
    }

    const data = await response.json();
    return data[0]?.result?.data?.json || null;
  } catch (error) {
    console.error(`TRPC call error: ${procedure}`, error);
    return null;
  }
}

async function trpcMutation<T>(procedure: string, input: any): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trpc/${procedure}?batch=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        "0": {
          json: input,
        },
      }),
    });

    if (!response.ok) {
      console.error(`TRPC mutation failed: ${procedure}`, response.status);
      return null;
    }

    const data = await response.json();
    return data[0]?.result?.data?.json || null;
  } catch (error) {
    console.error(`TRPC mutation error: ${procedure}`, error);
    return null;
  }
}

// Contact API
export async function searchContactsByEmail(email: string): Promise<Contact[]> {
  const result = await trpcCall<Contact[]>("contacts.searchByEmail", { email });
  return result || [];
}

export async function getContact(id: string): Promise<Contact | null> {
  return await trpcCall<Contact>("contacts.get", { id });
}

export async function createContact(data: {
  firstName: string;
  lastName: string;
  email: string;
  position?: string;
  phone?: string;
  phoneMobile?: string;
  department?: string;
  companyId?: string;
}): Promise<Contact | null> {
  return await trpcMutation<Contact>("contacts.create", data);
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<Contact | null> {
  return await trpcMutation<Contact>("contacts.update", { id, ...data });
}

// Company API
export async function getCompany(id: string): Promise<Company | null> {
  return await trpcCall<Company>("companies.get", { id });
}

export async function searchCompanies(query: string): Promise<Company[]> {
  const result = await trpcCall<Company[]>("companies.list", { search: query });
  return result || [];
}

export async function createCompany(data: {
  name: string;
  city?: string;
  country?: string;
  website?: string;
  products?: string;
  corporationId?: string;
}): Promise<Company | null> {
  return await trpcMutation<Company>("companies.create", data);
}

// Corporation API
export async function getCorporation(id: string): Promise<Corporation | null> {
  return await trpcCall<Corporation>("corporations.get", { id });
}

export async function searchCorporations(query: string): Promise<Corporation[]> {
  const result = await trpcCall<Corporation[]>("corporations.list", { search: query });
  return result || [];
}

export async function createCorporation(data: {
  name: string;
  status?: string;
  priority?: string;
  revenue?: number;
  country?: string;
}): Promise<Corporation | null> {
  return await trpcMutation<Corporation>("corporations.create", data);
}

// Activity API
export async function createActivity(data: {
  type: string;
  subject: string;
  description?: string;
  contactId?: string;
  companyId?: string;
  corporationId?: string;
}): Promise<Activity | null> {
  return await trpcMutation<Activity>("activities.create", data);
}

export async function getActivitiesByContact(contactId: string): Promise<Activity[]> {
  const result = await trpcCall<Activity[]>("activities.listByContact", { contactId });
  return result || [];
}

export async function getActivitiesByCompany(companyId: string): Promise<Activity[]> {
  const result = await trpcCall<Activity[]>("activities.listByCompany", { companyId });
  return result || [];
}
