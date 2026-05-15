import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import BurjLoader from './BurjLoader';

/**
 * Envuelve las rutas. Al cambiar de pestaña, muestra el BurjLoader
 * durante 1.4s y luego revela el nuevo contenido.
 * En la primera carga NO muestra el Burj (eso lo gestiona la app principal).
 */
export default function PageBurjWrapper({ children }) {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(children);
  const [showBurj, setShowBurj] = useState(false);
  const prevPath = useRef(location.pathname);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setDisplayed(children);
      return;
    }
    if (location.pathname === prevPath.current) {
      setDisplayed(children);
      return;
    }
    // Cambio de pestaña: mostrar Burj y cambiar contenido tras 700ms
    setShowBurj(true);
    const swapTimer = setTimeout(() => {
      setDisplayed(children);
      prevPath.current = location.pathname;
    }, 700);
    return () => clearTimeout(swapTimer);
  }, [location.pathname, children]);

  return (
    <>
      {showBurj && (
        <BurjLoader
          size="small"
          duration={1400}
          onDone={() => setShowBurj(false)}
        />
      )}
      {displayed}
    </>
  );
}
