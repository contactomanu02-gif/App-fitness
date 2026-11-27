/**
 * Pantalla de entrada: el logo de Fitness Approach entra girando como una pelota,
 * cruzan las dos rayas rojas de la marca y la pantalla se va en diagonal (~1,2 s).
 *
 * Es solo CSS (no espera a que cargue JavaScript) y sale una vez por sesión:
 * el script de abajo agrega un <style> que lo oculta si ya se vio en esta pestaña
 * o si es un navegador automatizado (pruebas). Con "menos movimiento" lo oculta el CSS.
 * (No se toca el atributo del div ni de <html>: React los pisa al hidratar.)
 * Nunca bloquea: no recibe toques y al terminar queda oculta.
 */
export function Splash() {
  return (
    <>
      <div id="fa-splash" className="splash" aria-hidden>
        <div className="splash-glow" />
        <span className="splash-slash splash-slash-1" />
        <span className="splash-slash splash-slash-2" />
        <div className="splash-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-256.png" alt="" width={132} height={132} className="splash-logo" />
          <p className="splash-name">
            Fitness <span>Approach</span>
          </p>
          <span className="splash-bar" />
        </div>
      </div>
      <script
        // Corre apenas se lee el HTML, antes de pintar: oculta el splash si no corresponde
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("fa-splash")||navigator.webdriver){var t=document.createElement("style");t.textContent="#fa-splash{display:none}";document.head.appendChild(t)}else{sessionStorage.setItem("fa-splash","1")}}catch(x){}`,
        }}
      />
    </>
  );
}
