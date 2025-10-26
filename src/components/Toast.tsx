import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import angry from "../assets/scream.jpg";
import motivation from "../assets/love.jpg";
import "./Toast.css";

interface ToastPayload {
    tipo: "angry" | "motivation" | "break";
    frase: string;
}

export const Toast: React.FC = () => {
    const [visible, setVisible] = useState(false); // CAMBIO: Volver a false para producción
    const [frase, setFrase] = useState("");
    const [imagenSrc, setImagenSrc] = useState("");
    const [tipoToast, setTipoToast] = useState<"angry" | "motivation" | "break">("motivation");

    useEffect(() => {
        console.log("[Toast] Listener inicializándose...");
        
        const handleToastEvent = async (event: Event) => {
            const customEvent = event as CustomEvent<ToastPayload>;
            console.log(`[Toast] ============ EVENTO RECIBIDO ============`);
            console.log(`[Toast] Event detail:`, customEvent.detail);
            
            const { tipo, frase } = customEvent.detail;
            console.log(`[Toast] Tipo: ${tipo}, Frase: ${frase}`);

            setFrase(frase);
            setTipoToast(tipo);
            
            if (tipo === "angry") {
                setImagenSrc(angry);
                console.log("[Toast] Imagen angry cargada");
            } else if (tipo === "motivation") {
                setImagenSrc(motivation);
                console.log("[Toast] Imagen motivation cargada");
            } else {
                setImagenSrc("");
                console.log("[Toast] Sin imagen (break)");
            }
            
            try {
                const currentWin = getCurrentWindow();
                
                console.log(`[Toast] 1. Actualizando estado visible...`);
                setVisible(true);
                
                console.log(`[Toast] 2. Mostrando ventana...`);
                await currentWin.show();
                
                console.log(`[Toast] 3. Estableciendo focus...`);
                await currentWin.setFocus();
                console.log(`[Toast] ✅ Toast visible!`);

                setTimeout(async () => {
                    console.log(`[Toast] 4. Ocultando después de 4 segundos...`);
                    setVisible(false);
                    
                    // Esperar a que la animación termine antes de ocultar la ventana
                    setTimeout(async () => {
                        await currentWin.hide();
                        console.log(`[Toast] ✅ Toast ocultado`);
                    }, 300); // Esperar el tiempo de transición CSS
                }, 4000);
            } catch (err) {
                console.error("[Toast] ❌ Error al mostrar ventana:", err);
            }
        };

        // Escuchar evento personalizado de JavaScript
        window.addEventListener('show-toast', handleToastEvent);
        console.log("[Toast] ✅ Listener configurado");

        return () => {
            window.removeEventListener('show-toast', handleToastEvent);
        };
    }, []);

    return (
        <div id='toast' className={`toast ${tipoToast} ${visible ? 'show' : 'hide'}`}>
            <div className="toast-container">
                <div className="toast-content">
                    {imagenSrc && <img src={imagenSrc} alt="Toast Image" className="toast-img" />}
                </div>
                <div className="toast-message">
                    <p id="frase">{frase}</p>
                </div>
            </div>
        </div>
    );
};
