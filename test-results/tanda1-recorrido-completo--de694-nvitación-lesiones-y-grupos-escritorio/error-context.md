# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tanda1.spec.ts >> recorrido completo: entrenador, alumno, invitación, lesiones y grupos
- Location: e2e/tanda1.spec.ts:18:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/invitacion/5fe7c5f36538cf1004ec775bfb3f55e072341f336e5ab944
Call log:
  - navigating to "http://localhost:3000/invitacion/5fe7c5f36538cf1004ec775bfb3f55e072341f336e5ab944", waiting until "load"

```

# Page snapshot

```yaml
- generic [active] [ref=f4e1]:
  - generic [ref=f4e2]:
    - complementary [ref=f4e3]:
      - generic [ref=f4e4]:
        - paragraph [ref=f4e5]: Manu Test Golf
        - paragraph [ref=f4e6]: Panel del entrenador
      - navigation [ref=f4e7]:
        - link "Inicio" [ref=f4e8] [cursor=pointer]:
          - /url: /panel
        - link "Alumnos" [ref=f4e12] [cursor=pointer]:
          - /url: /panel/alumnos
        - link "Rutinas" [ref=f4e18] [cursor=pointer]:
          - /url: /panel/rutinas
        - link "Ejercicios" [ref=f4e22] [cursor=pointer]:
          - /url: /panel/ejercicios
        - link "Grupos" [ref=f4e29] [cursor=pointer]:
          - /url: /panel/grupos
      - generic [ref=f4e34]:
        - generic [ref=f4e35]:
          - link "MT Manu Test" [ref=f4e36] [cursor=pointer]:
            - /url: /cuenta
            - generic [ref=f4e37]: MT
            - generic [ref=f4e38]: Manu Test
          - button "Usar modo oscuro" [ref=f4e39]:
            - generic [ref=f4e42]: system
        - button "Salir" [ref=f4e44]
    - main [ref=f4e49]:
      - generic [ref=f4e50]:
        - heading "Grupos" [level=1] [ref=f4e51]
        - paragraph [ref=f4e52]: Agrupá alumnos para asignarles entrenamientos en bloque.
        - generic [ref=f4e55]:
          - textbox "Nombre del nuevo grupo" [ref=f4e56]
          - button "Crear" [ref=f4e57]
        - list [ref=f4e59]:
          - listitem [ref=f4e60]:
            - link "Juveniles 1 alumno" [ref=f4e61] [cursor=pointer]:
              - /url: /panel/grupos/c3e153c3-aef4-4355-8645-cd4c570e45a8
              - generic [ref=f4e62]: Juveniles
              - generic [ref=f4e63]: 1 alumno
  - alert [ref=f4e64]
```

# Test source

```ts
  1   | import { test, expect, type Page } from "@playwright/test";
  2   | 
  3   | const rnd = () => Math.random().toString(36).slice(2, 8);
  4   | const PASSWORD = "clave-segura-123";
  5   | 
  6   | async function signUpCoach(page: Page, name: string, email: string) {
  7   |   await page.goto("/registro");
  8   |   await page.getByLabel("Nombre y apellido").fill(name);
  9   |   await page.getByLabel("Email").fill(email);
  10  |   await page.getByLabel("Contraseña").fill(PASSWORD);
  11  |   await page.getByRole("button", { name: "Crear cuenta" }).click();
  12  |   await expect(page).toHaveURL(/\/bienvenida/);
  13  |   await page.getByLabel("Nombre del espacio").fill(`${name} Golf`);
  14  |   await page.getByRole("button", { name: "Empezar" }).click();
  15  |   await expect(page).toHaveURL(/\/panel$/);
  16  | }
  17  | 
  18  | test("recorrido completo: entrenador, alumno, invitación, lesiones y grupos", async ({ page, browser, isMobile }) => {
  19  |   const coachEmail = `manu-${rnd()}@test.local`;
  20  |   const athleteEmail = `juan-${rnd()}@test.local`;
  21  | 
  22  |   // 1. Registro del entrenador y panel vacío
  23  |   await signUpCoach(page, "Manu Test", coachEmail);
  24  |   await expect(page.getByText("Empezá cargando a tus alumnos")).toBeVisible();
  25  | 
  26  |   // 2. Alta de alumno con datos de golf
  27  |   await page.getByRole("link", { name: "Cargar alumno" }).click();
  28  |   await page.getByLabel("Nombre", { exact: true }).fill("Juan");
  29  |   await page.getByLabel("Apellido").fill("Pérez");
  30  |   await page.getByLabel("Email").fill(athleteEmail);
  31  |   await page.getByLabel("Fecha de nacimiento").fill("2001-03-10");
  32  |   await page.getByLabel("Altura (cm)").fill("178");
  33  |   await page.getByLabel("Peso (kg)").fill("74,5");
  34  |   await page.getByLabel("Nivel deportivo").selectOption("intermedio");
  35  |   await page.getByLabel("Objetivos", { exact: true }).fill("Ganar velocidad de palo");
  36  |   await page.getByLabel("Handicap").fill("8,4");
  37  |   await page.getByLabel("Mano dominante").selectOption("Diestro");
  38  |   await page.getByText("Mar", { exact: true }).click();
  39  |   await page.getByText("Jue", { exact: true }).click();
  40  |   await page.getByText("Mancuernas", { exact: true }).click();
  41  |   await page.getByRole("button", { name: "Guardar alumno" }).click();
  42  | 
  43  |   await expect(page.getByRole("heading", { name: "Juan Pérez" })).toBeVisible();
  44  |   await expect(page.getByText("74.5 kg")).toBeVisible();
  45  |   await expect(page.getByText("8.4")).toBeVisible();
  46  |   await expect(page.getByText("Mar, Jue")).toBeVisible();
  47  |   await expect(page.getByText("Sin invitar").first()).toBeVisible();
  48  | 
  49  |   // 3. Validación: email duplicado
  50  |   await page.goto("/panel/alumnos/nuevo");
  51  |   await page.getByLabel("Nombre", { exact: true }).fill("Duplicado");
  52  |   await page.getByLabel("Email").fill(athleteEmail);
  53  |   await page.getByRole("button", { name: "Guardar alumno" }).click();
  54  |   await expect(page.getByText("Ya tenés un alumno con ese email.")).toBeVisible();
  55  | 
  56  |   // 4. Lesión cargada por el entrenador
  57  |   await page.goto("/panel/alumnos");
  58  |   await page.getByRole("link", { name: /Juan Pérez/ }).click();
  59  |   await page.getByRole("button", { name: "Agregar lesión" }).click();
  60  |   await page.getByLabel("Zona").fill("Lumbar");
  61  |   await page.getByLabel("Limitaciones para entrenar").fill("Evitar rotación cargada");
  62  |   await page.getByRole("button", { name: "Guardar", exact: true }).click();
  63  |   await expect(page.getByText("Evitar rotación cargada")).toBeVisible();
  64  | 
  65  |   // 5. Invitación
  66  |   await page.getByRole("button", { name: "Generar enlace" }).click();
  67  |   const link = await page.getByTestId("invite-link").inputValue();
  68  |   expect(link).toContain("/invitacion/");
  69  |   const athleteUrl = (await page.getByRole("heading", { name: "Juan Pérez" }).isVisible()) ? page.url() : "";
  70  | 
  71  |   // 6. Grupo
  72  |   await page.goto("/panel/grupos");
  73  |   await page.getByLabel("Nombre del nuevo grupo").fill("Juveniles");
  74  |   await page.getByRole("button", { name: "Crear" }).click();
  75  |   await expect(page.getByRole("heading", { name: "Juveniles" })).toBeVisible();
  76  |   await page.getByLabel("Juan Pérez").check();
  77  |   await page.getByRole("button", { name: "Guardar grupo" }).click();
  78  |   await expect(page.getByText("Grupo guardado.")).toBeVisible();
  79  |   await page.goto("/panel/grupos");
  80  |   await expect(page.getByText("1 alumno")).toBeVisible();
  81  | 
  82  |   // 7. El alumno acepta la invitación en otro navegador
  83  |   const ctx = await browser.newContext(isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : {});
  84  |   const student = await ctx.newPage();
> 85  |   await student.goto(link);
      |                 ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/invitacion/5fe7c5f36538cf1004ec775bfb3f55e072341f336e5ab944
  86  |   await expect(student.getByText("te invitó a entrenar")).toBeVisible();
  87  |   await student.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  88  |   await student.getByLabel("Repetila").fill(PASSWORD);
  89  |   await student.getByRole("button", { name: "Crear mi cuenta" }).click();
  90  |   await expect(student).toHaveURL(/\/app$/);
  91  |   await expect(student.getByRole("heading", { name: "Juan" })).toBeVisible();
  92  |   await expect(student.getByText("Todavía no tenés entrenamientos asignados")).toBeVisible();
  93  | 
  94  |   // 8. El alumno avisa una molestia
  95  |   await student.goto("/app/perfil");
  96  |   await expect(student.getByText("Lumbar")).toBeVisible();
  97  |   await student.getByRole("button", { name: "Avisar una molestia" }).click();
  98  |   await student.getByLabel("Zona").fill("Muñeca izquierda");
  99  |   await student.getByLabel("Gravedad").selectOption("moderada");
  100 |   await student.getByRole("button", { name: "Guardar", exact: true }).click();
  101 |   await expect(student.getByText("Muñeca izquierda")).toBeVisible();
  102 | 
  103 |   // El enlace ya no sirve
  104 |   await student.goto(link);
  105 |   await expect(student.getByText("Invitación no válida")).toBeVisible();
  106 | 
  107 |   // El alumno no puede entrar al panel del entrenador
  108 |   await student.goto("/panel");
  109 |   await expect(student).toHaveURL(/\/app$/);
  110 |   await ctx.close();
  111 | 
  112 |   // 9. El entrenador ve la cuenta vinculada y la molestia reportada
  113 |   await page.goto("/panel");
  114 |   await expect(page.getByText("Reportada por el alumno")).toBeVisible();
  115 |   await expect(page.getByText("Muñeca izquierda")).toBeVisible();
  116 |   if (athleteUrl) {
  117 |     await page.goto(athleteUrl);
  118 |     await expect(page.getByText("Con cuenta").first()).toBeVisible();
  119 |   }
  120 | 
  121 |   // 10. Editar y archivar
  122 |   await page.goto("/panel/alumnos");
  123 |   await page.getByRole("link", { name: /Juan Pérez/ }).click();
  124 |   await page.getByRole("link", { name: "Editar ficha" }).click();
  125 |   await page.getByLabel("Peso (kg)").fill("76");
  126 |   await page.getByRole("button", { name: "Guardar cambios" }).click();
  127 |   await expect(page.getByText("76 kg")).toBeVisible();
  128 |   await page.getByRole("button", { name: "Archivar alumno" }).click();
  129 |   await page.getByRole("button", { name: "Archivar", exact: true }).click();
  130 |   await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
  131 |   await page.goto("/panel/alumnos");
  132 |   await expect(page.getByText("Todavía no cargaste alumnos")).toBeVisible();
  133 | });
  134 | 
  135 | test("otro entrenador no puede ver alumnos ajenos", async ({ page, browser }) => {
  136 |   await signUpCoach(page, "Coach Uno", `uno-${rnd()}@test.local`);
  137 |   await page.goto("/panel/alumnos/nuevo");
  138 |   await page.getByLabel("Nombre", { exact: true }).fill("Privado");
  139 |   await page.getByRole("button", { name: "Guardar alumno" }).click();
  140 |   await expect(page.getByRole("heading", { name: "Privado" })).toBeVisible();
  141 |   const url = page.url();
  142 | 
  143 |   const ctx = await browser.newContext();
  144 |   const other = await ctx.newPage();
  145 |   await signUpCoach(other, "Coach Dos", `dos-${rnd()}@test.local`);
  146 |   const res = await other.goto(url);
  147 |   expect(res?.status()).toBe(404);
  148 |   await ctx.close();
  149 | });
  150 | 
  151 | test("rutas protegidas y login con error", async ({ page }) => {
  152 |   await page.goto("/panel/alumnos");
  153 |   await expect(page).toHaveURL(/\/ingresar\?next=%2Fpanel%2Falumnos/);
  154 |   await page.getByLabel("Email").fill("nadie@test.local");
  155 |   await page.getByLabel("Contraseña").fill("incorrecta");
  156 |   await page.getByRole("button", { name: "Ingresar" }).click();
  157 |   await expect(page.getByText("Email o contraseña incorrectos.")).toBeVisible();
  158 | });
  159 | 
```