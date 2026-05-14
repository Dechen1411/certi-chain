import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Award, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../context/AuthContext";
import { IconBadge, primaryActionClass, subtlePanelClass } from "./ui/app-primitives";
import { cn } from "./ui/utils";

const ALLOWED_STUDENT_DOMAIN = "@rub.edu.bt";

export function Login() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigateByRole = (role: "admin" | "student") => {
    if (role === "admin") {
      navigate("/admin/dashboard");
      return;
    }
    navigate("/student/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    let user = null;
    try {
      user = await login(loginData.identifier, loginData.password);
    } catch {
      setError("Unable to sign in right now. Please try again.");
      setIsLoading(false);
      return;
    }

    if (!user) {
      setError("Invalid credentials. Register first if you are a new user.");
      setIsLoading(false);
      return;
    }

    navigateByRole(user.role);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const normalizedEmail = registerData.email.trim().toLowerCase();
    if (!normalizedEmail.endsWith(ALLOWED_STUDENT_DOMAIN)) {
      setError("Student account requires @rub.edu.bt email");
      return;
    }

    setIsLoading(true);

    let success = false;
    try {
      success = await signup({
        email: normalizedEmail,
        password: registerData.password,
        name: registerData.name,
        role: "student",
      });
    } catch {
      setError("Unable to create account right now. Please try again.");
      setIsLoading(false);
      return;
    }

    if (!success) {
      setError("Email or username already registered");
      setIsLoading(false);
      return;
    }

    navigateByRole("student");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="flex items-center justify-center gap-3">
          <IconBadge icon={Award} tone="slate" className="h-12 w-12" />
          <div>
            <h1 className="font-bold text-gray-900 text-xl">CertiChain</h1>
            <p className="text-xs text-gray-500">Sign in to your account</p>
          </div>
        </Link>

        <Card className={cn("p-8", subtlePanelClass)}>
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <Button
              type="button"
              variant={mode === "login" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Login
            </Button>
            <Button
              type="button"
              variant={mode === "register" ? "default" : "ghost"}
              className="flex-1"
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Register
            </Button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Username or Email</Label>
                <Input
                  id="identifier"
                  type="text"
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  placeholder="Enter username or email"
                  required
                />
              </div>

              <div>
                <Label htmlFor="loginPassword">Password</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full gap-2 ${primaryActionClass}`}
              >
                <LogIn className="w-4 h-4" />
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="registerName">Full Name</Label>
                <Input
                  id="registerName"
                  type="text"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="registerEmail">Email</Label>
                <Input
                  id="registerEmail"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  placeholder="your.name@rub.edu.bt"
                  required
                />
              </div>

              <div>
                <Label htmlFor="registerPassword">Password</Label>
                <Input
                  id="registerPassword"
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  placeholder="Create password"
                  required
                />
              </div>

              <div>
                <Label htmlFor="registerConfirmPassword">Confirm Password</Label>
                <Input
                  id="registerConfirmPassword"
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  required
                />
              </div>

              <p className="text-xs text-gray-500">
                Student registration only. Admin accounts can sign in with pre-provisioned credentials.
              </p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full gap-2 ${primaryActionClass}`}
              >
                <UserPlus className="w-4 h-4" />
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          )}
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
