/// <reference types="astro/client" />
declare namespace App {
  interface Locals { user?: { id: number; name: string; email: string; role: string } }
}
