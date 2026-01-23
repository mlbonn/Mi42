const API_BASE_URL = "https://46.224.13.250";

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trpc/auth.login?batch=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({
        "0": {
          json: {
            username,
            password,
          },
        },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: "Login fehlgeschlagen",
      };
    }

    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    if (result?.success && result?.user) {
      // Store user data
      await storeUser(result.user);
      return {
        success: true,
        user: result.user,
      };
    }

    return {
      success: false,
      error: "Ungültige Anmeldedaten",
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      error: "Netzwerkfehler",
    };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/trpc/auth.logout?batch=1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        "0": {
          json: {},
        },
      }),
    });
  } catch (error) {
    console.error("Logout error:", error);
  }
  
  await clearUser();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trpc/auth.me?batch=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const user = data[0]?.result?.data?.json;

    if (user) {
      await storeUser(user);
      return user;
    }

    return null;
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
}

// Storage helpers using Office.context.roamingSettings
async function storeUser(user: User): Promise<void> {
  if (typeof Office !== "undefined" && Office.context?.roamingSettings) {
    Office.context.roamingSettings.set("friday_user", JSON.stringify(user));
    await Office.context.roamingSettings.saveAsync();
  } else {
    // Fallback to localStorage for development
    localStorage.setItem("friday_user", JSON.stringify(user));
  }
}

async function clearUser(): Promise<void> {
  if (typeof Office !== "undefined" && Office.context?.roamingSettings) {
    Office.context.roamingSettings.remove("friday_user");
    await Office.context.roamingSettings.saveAsync();
  } else {
    localStorage.removeItem("friday_user");
  }
}

export function getStoredUser(): User | null {
  try {
    let userJson: string | null = null;
    
    if (typeof Office !== "undefined" && Office.context?.roamingSettings) {
      userJson = Office.context.roamingSettings.get("friday_user");
    } else {
      userJson = localStorage.getItem("friday_user");
    }

    if (userJson) {
      return JSON.parse(userJson);
    }
  } catch (error) {
    console.error("Get stored user error:", error);
  }
  
  return null;
}
