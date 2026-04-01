// "use client";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { AuthContextProvider } from "@/context/AuthContext";
import { IconHome, IconMessage, IconUser } from "@tabler/icons-react";
import { FaBagShopping, FaChair, FaDollarSign, FaFlag, FaLock, FaTable, FaUserGroup } from "react-icons/fa6";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  manifest: "/manifest.json",
  title: " Self Healing Code",
  description: "The only application to make your prototypes",
};

const navItems = [
  {
    name: "Home",
    link: "/",
    icon: <IconHome className="h-4 w-4 text-neutral-500 dark:text-white" />,
  },
  {
    name: "Editor",
    link: "/dashboard",
    icon: <IconUser className="h-4 w-4 text-neutral-500 dark:text-white" />,
  },
  
  {
    name: "Github",
    link: "/github",
    icon: <FaFlag className="h-4 w-4 text-neutral-500 dark:text-white" />,
  }

];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (


      <html lang="en" className="[background:radial-gradient(70%_70%_at_50%_10%,#fff_40%,#2436ffb1_100%)]">
      <body className={inter.className}>
        <FloatingNav navItems={navItems} />
        <Toaster />
        <AuthContextProvider>
          {children}
        </AuthContextProvider>
      </body>
    </html>

  );
}
