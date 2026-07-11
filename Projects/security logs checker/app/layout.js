import "./globals.css";

export const metadata = {
  title: "Sentinel SOC — AI Security Operations Assistant",
  description: "AI-powered SOC analyst: log analysis, threat detection, and incident reporting.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
