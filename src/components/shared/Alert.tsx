import React, { useEffect } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { GlassElement } from "../shared/Liquid Glass/GlassElement";

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info" | "confirm";
  confirmText?: string;
  cancelText?: string;
}

const Alert: React.FC<AlertProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "info",
  confirmText = "Aceptar",
  cancelText = "Cancelar",
}) => {
  useEffect(() => {
    if (isOpen) {
      // Prevenir scroll del body
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleIcon className="w-12 h-12 text-green-400" />;
      case "error":
        return <XCircleIcon className="w-12 h-12 text-red-400" />;
      case "warning":
        return <ExclamationCircleIcon className="w-12 h-12 text-yellow-400" />;
      case "confirm":
        return <InformationCircleIcon className="w-12 h-12 text-accent" />;
      default:
        return <InformationCircleIcon className="w-12 h-12 text-blue-400" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case "success":
        return "border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-600/10";
      case "error":
        return "border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/10";
      case "warning":
        return "border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10";
      case "confirm":
        return "border-accent/30 bg-gradient-to-br from-accent/10 to-primary/10";
      default:
        return "border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/10";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <GlassElement
        width={448}
        height={0}
        radius={16}
        depth={10}
        strength={80}
        chromaticAberration={3}
        blur={4}
      >
        <div
          className={`border-2 ${getColorClasses()} max-w-md w-full p-6 rounded-2xl shadow-2xl animate-scaleIn`}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxHeight: "90vh",
            overflowY: "auto",
            position: "relative",
          }}
        >
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-6 h-6 text-tertiary/70 hover:text-tertiary" />
          </button>

          {/* Icono */}
          <div className="flex justify-center mb-4">{getIcon()}</div>

          {/* Título */}
          <h3 className="text-2xl font-bold text-center text-tertiary mb-3">
            {title}
          </h3>

          {/* Mensaje */}
          <p className="text-center text-tertiary/80 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Botones */}
          <div className="flex gap-3 justify-center">
            {type === "confirm" && onConfirm ? (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg glass-panel border border-primary/30 text-tertiary hover:bg-white/5 transition-all duration-200 hover:scale-105 font-medium"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="btn-accent px-6 py-2.5 font-medium hover:scale-105 transition-all duration-200"
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="btn-primary px-8 py-2.5 font-medium hover:scale-105 transition-all duration-200"
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </GlassElement>
    </div>
  );
};

export default Alert;
