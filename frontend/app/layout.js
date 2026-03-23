import './globals.css'

export const metadata = {
  title: 'FlowForge — Workflow Automation',
  description: 'Visual workflow automation platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white antialiased">{children}</body>
    </html>
  )
}
