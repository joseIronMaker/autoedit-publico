"""Primera app de escritorio: una entrada, un boton y una etiqueta que responde."""
import tkinter as tk

ventana = tk.Tk()
ventana.title("Mi primera app")
ventana.geometry("560x300+2180+180")     # posición absoluta: segundo monitor

tk.Label(ventana, text="¿Cómo te llamas?", font=("Arial", 20)).pack(pady=18)
caja = tk.Entry(ventana, font=("Arial", 18), width=22)
caja.pack()
salida = tk.Label(ventana, text="", font=("Arial", 22), fg="#A8681F")


def saludar():
    salida.config(text=f"¡Hola, {caja.get()}!")


tk.Button(ventana, text="Saludar", font=("Arial", 18), command=saludar).pack(pady=14)
salida.pack()

caja.insert(0, "José")
ventana.after(2500, saludar)
# 45 s: la escena más larga que la usa dura 20, y antes se cerraba a los 14 dejando
# el resto del plano en negro
ventana.after(45000, ventana.destroy)
ventana.mainloop()
