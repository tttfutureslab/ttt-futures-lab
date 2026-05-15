import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

/**
 * Efecto "Burj Khalifa": al cambiar de pestaña, el contenido sale
 * elevándose hacia arriba con escala creciente (como subir un rascacielos),
 * y el siguiente aparece desde abajo con el mismo efecto inverso.
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState('idle');
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === prevPath.current) {
      setDisplayChildren(children);
      return;
    }

    setTransitionState('exiting');
    const exitTimer = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionState('entering');
      const enterTimer = setTimeout(() => {
        setTransitionState('idle');
        prevPath.current = location.pathname;
      }, 500);
      return () => clearTimeout(enterTimer);
    }, 400);
    return () => clearTimeout(exitTimer);
  }, [location.pathname, children]);

  return (
    <div className={`page-transition page-${transitionState}`}>
      {displayChildren}
    </div>
  );
}
