import { LogicalPosition } from "@tauri-apps/api/dpi";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, primaryMonitor } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import angry from "../assets/scream.jpg";
import motivation from "../assets/love.jpg";
import "./Toast.css";

interface ToastPayload {
    tipo: "angry" | "motivation" | "break";
    frase: string;
}

const getRandomPosition = async (): Promise<LogicalPosition> => {
    const monitor = await primaryMonitor();
    if (!monitor) return new LogicalPosition(0, 0);

    const windowSize = await getCurrentWindow().innerSize();
    const monitorSize = monitor.size;
    const margin = 20;

    const screenW = monitorSize.width;
    const screenH = monitorSize.height;
    const winW = windowSize.width;
    const winH = windowSize.height;

    const positions: LogicalPosition[] = [
        new LogicalPosition(margin, margin), // top-left
        new LogicalPosition(screenW - winW - margin, margin), // top-right
        new LogicalPosition(margin, screenH - winH - margin), // bottom-left
        new LogicalPosition(screenW - winW - margin, screenH - winH - margin), // bottom-right
        new LogicalPosition((screenW / 2) - (winW / 2), margin), // top-center
        new LogicalPosition(
            (screenW / 2) - (winW / 2),
            screenH - winH - margin,
        ), // bottom-center
        new LogicalPosition(margin, (screenH / 2) - (winH / 2)), // middle-left
        new LogicalPosition(
            screenW - winW - margin,
            (screenH / 2) - (winH / 2),
        ), // middle-right
    ];

    return positions[Math.floor(Math.random() * positions.length)];
};

export const Toast: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [frase, setFrase] = useState("");
    const [imagenSrc, setImagenSrc] = useState("");
    const [tipoToast, setTipoToast] = useState<"angry" | "motivation" | "break">("motivation");

    useEffect(() => {
        const unlisten = listen<ToastPayload>("show-toast", async (e) => {
            const { tipo, frase } = e.payload;

            setFrase(frase);
            setTipoToast(tipo);
            
            if (tipo === "angry") {
                setImagenSrc(angry);
            } else if (tipo === "motivation") {
                setImagenSrc(motivation);
            } else {
                setImagenSrc("");
            }
            
            const newPosition = await getRandomPosition();
            await getCurrentWindow().setPosition(newPosition);
            await getCurrentWindow().show();
            setVisible(true);

            setTimeout(() => {
                setVisible(false);
                getCurrentWindow().hide();
            }, 4000);
        });

        return () => {
            unlisten.then((f) => f());
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
