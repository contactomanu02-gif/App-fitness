import { z } from "zod";

// Mensajes de validación en español para cualquier caso no personalizado.
z.config(z.locales.es());

export { z };
