import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'¿Cuánto sabés de bondis?',description:'Un viaje de preguntas por los colectivos del mundo.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="es-AR"><body>{children}</body></html>}
