import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { AlertCircle, Award, CheckCircle2, KeyRound, LogIn, MailCheck, UserPlus } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../context/AuthContext";
import { IconBadge, primaryActionClass, subtlePanelClass } from "./ui/app-primitives";
import { cn } from "./ui/utils";

const ALLOWED_STUDENT_DOMAIN = "@rub.edu.bt";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const navigate = useNavigate();
  const {
    login,
    requestSignupOtp,
    verifySignupOtp,
    requestPasswordResetOtp,
    verifyPasswordResetOtp,
  } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [isAwaitingOtp, setIsAwaitingOtp] = useState(false);

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

  const [resetData, setResetData] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingSignupEmail, setPendingSignupEmail] = useState("");
  const [otpPreview, setOtpPreview] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [isResetOtpSent, setIsResetOtpSent] = useState(false);
  const [resetOtpPreview, setResetOtpPreview] = useState("");
  const [resetOtpExpiresIn, setResetOtpExpiresIn] = useState(0);

  const navigateByRole = (role: "admin" | "student") => {
    if (role === "admin") {
      navigate("/admin/dashboard");
      return;
    }
    navigate("/student/dashboard");
  };

  const resetOtpState = () => {
    setIsAwaitingOtp(false);
    setOtpCode("");
    setPendingSignupEmail("");
    setOtpPreview("");
    setOtpExpiresIn(0);
  };

  const resetPasswordResetState = () => {
    setIsResetOtpSent(false);
    setResetData({
      email: "",
      otp: "",
      password: "",
      confirmPassword: "",
    });
    setResetOtpPreview("");
    setResetOtpExpiresIn(0);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    let user = null;
    try {
      user = await login(loginData.identifier, loginData.password);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in right now. Please try again.");
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

  const requestRegistrationOtp = async () => {
    setError("");
    setSuccessMessage("");

    if (registerData.password !== registerData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (registerData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    const normalizedEmail = registerData.email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    if (!normalizedEmail.endsWith(ALLOWED_STUDENT_DOMAIN)) {
      setError("Student account requires @rub.edu.bt email");
      return;
    }

    setIsLoading(true);

    try {
      const payload = await requestSignupOtp({
        email: normalizedEmail,
        password: registerData.password,
        name: registerData.name,
        role: "student",
      });
      setPendingSignupEmail(payload.email || normalizedEmail);
      setOtpPreview(payload.otpPreview || "");
      setOtpExpiresIn(payload.expiresInSeconds || 0);
      setOtpCode("");
      setIsAwaitingOtp(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create account right now. Please try again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestRegistrationOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedOtp = otpCode.trim();
    if (!/^\d{6}$/.test(normalizedOtp)) {
      setError("Enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);

    try {
      await verifySignupOtp({
        email: pendingSignupEmail,
        otp: normalizedOtp,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to verify the code right now. Please try again.");
      setIsLoading(false);
      return;
    }

    navigateByRole("student");
  };

  const requestPasswordResetCode = async () => {
    setError("");
    setSuccessMessage("");

    const normalizedEmail = resetData.email.trim().toLowerCase();
    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const payload = await requestPasswordResetOtp({ email: normalizedEmail });
      setResetData((current) => ({
        ...current,
        email: payload.email || normalizedEmail,
        otp: "",
      }));
      setResetOtpPreview(payload.otpPreview || "");
      setResetOtpExpiresIn(payload.expiresInSeconds || 0);
      setIsResetOtpSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to send reset code right now. Please try again.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestPasswordResetCode();
  };

  const handleVerifyPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedEmail = resetData.email.trim().toLowerCase();
    const normalizedOtp = resetData.otp.trim();

    if (!emailPattern.test(normalizedEmail)) {
      setError("Enter a valid email address");
      return;
    }

    if (!/^\d{6}$/.test(normalizedOtp)) {
      setError("Enter the 6-digit reset code");
      return;
    }

    if (resetData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (resetData.password !== resetData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      await verifyPasswordResetOtp({
        email: normalizedEmail,
        otp: normalizedOtp,
        password: resetData.password,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to reset password right now. Please try again.");
      setIsLoading(false);
      return;
    }

    setLoginData({ identifier: normalizedEmail, password: "" });
    resetPasswordResetState();
    setMode("login");
    setSuccessMessage("Password reset successful. Sign in with your new password.");
    setIsLoading(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-8 sm:py-12">
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
                setSuccessMessage("");
                resetOtpState();
                resetPasswordResetState();
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
                setSuccessMessage("");
                resetPasswordResetState();
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

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-sm text-gray-600"
                  onClick={() => {
                    const identifier = loginData.identifier.trim().toLowerCase();
                    setMode("forgot");
                    setError("");
                    setSuccessMessage("");
                    resetOtpState();
                    setResetData((current) => ({
                      ...current,
                      email: emailPattern.test(identifier) ? identifier : current.email,
                    }));
                  }}
                >
                  <KeyRound className="w-4 h-4" />
                  Forgot password?
                </Button>
              </div>

              {successMessage && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">{successMessage}</span>
                </div>
              )}

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
          ) : mode === "forgot" ? (
            !isResetOtpSent ? (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
                  <p className="text-sm text-gray-500">Enter your account email to receive a reset code.</p>
                </div>

                <div>
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    value={resetData.email}
                    onChange={(e) => setResetData({ ...resetData, email: e.target.value })}
                    placeholder="Enter your account email"
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
                  <MailCheck className="w-4 h-4" />
                  {isLoading ? "Sending code..." : "Send Reset Code"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  className="w-full"
                  onClick={() => {
                    setMode("login");
                    setError("");
                    resetPasswordResetState();
                  }}
                >
                  Back to Login
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyPasswordReset} className="space-y-4">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    If the account exists, a 6-digit reset code was sent to{" "}
                    <span className="font-semibold">{resetData.email}</span>.
                    {resetOtpExpiresIn > 0 ? ` It expires in ${Math.ceil(resetOtpExpiresIn / 60)} minutes.` : ""}
                  </p>
                  {resetOtpPreview && (
                    <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Development OTP: <span className="font-semibold tracking-widest">{resetOtpPreview}</span>
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="resetOtp">Reset Code</Label>
                  <Input
                    id="resetOtp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={resetData.otp}
                    onChange={(e) => setResetData({
                      ...resetData,
                      otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                    })}
                    placeholder="Enter 6-digit code"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={resetData.password}
                    onChange={(e) => setResetData({ ...resetData, password: e.target.value })}
                    placeholder="Create new password"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={resetData.confirmPassword}
                    onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
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
                  <KeyRound className="w-4 h-4" />
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => {
                      setError("");
                      setIsResetOtpSent(false);
                      setResetOtpPreview("");
                      setResetOtpExpiresIn(0);
                      setResetData((current) => ({
                        ...current,
                        otp: "",
                        password: "",
                        confirmPassword: "",
                      }));
                    }}
                  >
                    Edit Email
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => void requestPasswordResetCode()}
                  >
                    Resend Code
                  </Button>
                </div>
              </form>
            )
          ) : isAwaitingOtp ? (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  We sent a 6-digit verification code to <span className="font-semibold">{pendingSignupEmail}</span>.
                  {otpExpiresIn > 0 ? ` It expires in ${Math.ceil(otpExpiresIn / 60)} minutes.` : ""}
                </p>
                {otpPreview && (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Development OTP: <span className="font-semibold tracking-widest">{otpPreview}</span>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="otpCode">Verification Code</Label>
                <Input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit code"
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
                <UserPlus className="w-4 h-4" />
                {isLoading ? "Verifying..." : "Verify & Create Account"}
              </Button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => {
                    setError("");
                    resetOtpState();
                  }}
                >
                  Edit Details
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => void requestRegistrationOtp()}
                >
                  Resend Code
                </Button>
              </div>
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
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
