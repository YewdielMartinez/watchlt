import React, { useState, useEffect, useRef, memo } from "react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage: React.FC<LazyImageProps> = memo(
  ({
    src,
    alt,
    className = "",
    placeholderSrc = "https://via.placeholder.com/300x450?text=Cargando...",
    onLoad,
    onError,
  }) => {
    const [imageSrc, setImageSrc] = useState<string>(placeholderSrc);
    const [imageLoaded, setImageLoaded] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
      // Intersection Observer para lazy loading
      if (!imgRef.current) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Cargar la imagen cuando esté visible
              const img = new Image();
              img.src = src;

              img.onload = () => {
                setImageSrc(src);
                setImageLoaded(true);
                onLoad?.();
              };

              img.onerror = () => {
                setImageSrc(placeholderSrc);
                onError?.();
              };

              // Dejar de observar una vez cargada
              if (imgRef.current && observerRef.current) {
                observerRef.current.unobserve(imgRef.current);
              }
            }
          });
        },
        {
          rootMargin: "50px", // Cargar con 50px de anticipación
          threshold: 0.01,
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [src, placeholderSrc, onLoad, onError]);

    return (
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${
          imageLoaded ? "opacity-100" : "opacity-70"
        } transition-opacity duration-300`}
        loading="lazy"
      />
    );
  }
);

LazyImage.displayName = "LazyImage";

export default LazyImage;
