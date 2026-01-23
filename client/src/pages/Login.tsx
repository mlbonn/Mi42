import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";

const DEV_MODE = import.meta.env.DEV;

export default function Login() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // DEV_MODE: Auto-login
  useEffect(() => {
    if (DEV_MODE) {
      console.log('[DEV_MODE] Auto-login to dashboard');
      window.location.href = '/';
    }
  }, []);

  const loginMutation = trpc.simpleAuth.login.useMutation({
    onSuccess: () => {
      toast.success("Login erfolgreich!");
      // Reload to update auth state
      window.location.href = "/";
    },
    onError: (error) => {
      toast.error(error.message || "Login fehlgeschlagen");
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // DEV_MODE: Skip validation
    if (!DEV_MODE) {
      if (!username || !password) {
        toast.error("Bitte Username und Passwort eingeben");
        return;
      }
    }
    
    setIsLoading(true);
    loginMutation.mutate({ username: username || 'dev@test.com', password: password || 'dev' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          {APP_LOGO && (
            <div className="flex justify-center">
              <img src={APP_LOGO} alt={APP_TITLE} className="h-12" />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl font-bold">{APP_TITLE}</CardTitle>
            <CardDescription className="mt-2">
              Melde dich mit deinem Account an
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Dein Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Dein Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Anmelden..." : "Anmelden"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Noch kein Account?</p>
            <p className="mt-1">Kontaktiere deinen Administrator.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
