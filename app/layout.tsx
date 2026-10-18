import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Cap_Canal · Diseño hidráulico",description:"Diseña, guarda y documenta canales abiertos con cálculo hidráulico de Manning."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>;}
