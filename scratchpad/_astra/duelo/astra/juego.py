"""Juego de naves. Requiere pygame: python3 -m pip install pygame."""

import math
import random

import pygame


ANCHO, ALTO = 800, 700
FONDO = (8, 12, 30)
BLANCO = (230, 240, 255)
CIAN = (70, 220, 255)


class Juego:
    def __init__(self):
        pygame.init()
        self.pantalla = pygame.display.set_mode((ANCHO, ALTO))
        pygame.display.set_caption("Defensa estelar")
        self.reloj = pygame.time.Clock()
        self.fuente = pygame.font.Font(None, 30)
        self.grande = pygame.font.Font(None, 68)
        self.estrellas = [
            [random.randrange(ANCHO), random.randrange(ALTO), random.uniform(25, 90)]
            for _ in range(90)
        ]
        self.reiniciar()

    def reiniciar(self):
        self.nave = pygame.Vector2(ANCHO / 2, ALTO - 70)
        self.balas = []
        self.enemigos = []
        self.particulas = []
        self.puntos = 0
        self.vidas = 3
        self.nivel = 0
        self.recarga = 0
        self.invulnerable = 1.5
        self.fin = False
        self.nueva_oleada()

    def nueva_oleada(self):
        self.nivel += 1
        self.enemigos = [
            pygame.Vector2(100 + columna * 75, 90 + fila * 52)
            for fila in range(4)
            for columna in range(9)
        ]
        self.direccion = 1

    def explosion(self, posicion, color):
        for _ in range(16):
            angulo = random.uniform(0, math.tau)
            velocidad = random.uniform(50, 190)
            self.particulas.append([
                pygame.Vector2(posicion),
                pygame.Vector2(math.cos(angulo), math.sin(angulo)) * velocidad,
                random.uniform(0.2, 0.6), color,
            ])

    @staticmethod
    def caja(posicion, ancho, alto):
        return pygame.Rect(round(posicion.x - ancho / 2),
                           round(posicion.y - alto / 2), ancho, alto)

    def actualizar(self, dt):
        for estrella in self.estrellas:
            estrella[1] = (estrella[1] + estrella[2] * dt) % ALTO
        for particula in self.particulas[:]:
            particula[0] += particula[1] * dt
            particula[2] -= dt
            if particula[2] <= 0:
                self.particulas.remove(particula)
        if self.fin:
            return

        teclas = pygame.key.get_pressed()
        movimiento = pygame.Vector2(
            int(teclas[pygame.K_RIGHT]) - int(teclas[pygame.K_LEFT]),
            int(teclas[pygame.K_DOWN]) - int(teclas[pygame.K_UP]),
        )
        if movimiento.length_squared():
            self.nave += movimiento.normalize() * 340 * dt
        self.nave.x = max(24, min(ANCHO - 24, self.nave.x))
        self.nave.y = max(76, min(ALTO - 42, self.nave.y))
        self.recarga = max(0, self.recarga - dt)
        self.invulnerable = max(0, self.invulnerable - dt)
        if teclas[pygame.K_SPACE] and self.recarga <= 0:
            self.balas.append(self.nave + pygame.Vector2(0, -25))
            self.recarga = 0.18
        for bala in self.balas[:]:
            bala.y -= 570 * dt
            if bala.y < -15:
                self.balas.remove(bala)

        velocidad = min(160, 38 + self.nivel * 10)
        for enemigo in self.enemigos:
            enemigo.x += self.direccion * velocidad * dt
            enemigo.y += min(32, 6 + self.nivel * 2) * dt
        if self.enemigos:
            izquierda = min(e.x for e in self.enemigos)
            derecha = max(e.x for e in self.enemigos)
            ajuste = 0
            if derecha > ANCHO - 28:
                ajuste = ANCHO - 28 - derecha
                self.direccion = -1
            elif izquierda < 28:
                ajuste = 28 - izquierda
                self.direccion = 1
            if ajuste:
                for enemigo in self.enemigos:
                    enemigo.x += ajuste
                    enemigo.y += 16

        for bala in self.balas[:]:
            for enemigo in self.enemigos[:]:
                if self.caja(bala, 6, 18).colliderect(self.caja(enemigo, 38, 28)):
                    self.explosion(enemigo, (255, 120, 110))
                    self.enemigos.remove(enemigo)
                    self.balas.remove(bala)
                    self.puntos += 10
                    break

        impacto = False
        for enemigo in self.enemigos[:]:
            toca = self.caja(self.nave, 32, 34).colliderect(
                self.caja(enemigo, 38, 28))
            if enemigo.y >= ALTO - 24 or (toca and self.invulnerable <= 0):
                impacto = True
                break
        if impacto:
            self.explosion(self.nave, CIAN)
            self.vidas -= 1
            self.balas.clear()
            self.nave.update(ANCHO / 2, ALTO - 70)
            self.invulnerable = 2
            if self.vidas <= 0:
                self.fin = True
            else:
                # Reubicar la formación evita perder varias vidas en un instante.
                fondo = max(e.y for e in self.enemigos)
                for enemigo in self.enemigos:
                    enemigo.y += 246 - fondo
        if not self.enemigos and not self.fin:
            self.nueva_oleada()

    def texto(self, contenido, centro, grande=False, color=BLANCO):
        imagen = (self.grande if grande else self.fuente).render(contenido, True, color)
        self.pantalla.blit(imagen, imagen.get_rect(center=centro))

    def dibujar(self):
        self.pantalla.fill(FONDO)
        for x, y, velocidad in self.estrellas:
            tono = int(90 + velocidad)
            pygame.draw.circle(self.pantalla, (tono, tono, tono), (int(x), int(y)), 1)
        for enemigo in self.enemigos:
            x, y = round(enemigo.x), round(enemigo.y)
            pygame.draw.polygon(self.pantalla, (245, 95, 115), [
                (x - 19, y - 8), (x - 10, y - 14), (x + 10, y - 14),
                (x + 19, y - 8), (x + 19, y + 10), (x + 9, y + 5),
                (x, y + 14), (x - 9, y + 5), (x - 19, y + 10),
            ])
            for desplazamiento in (-8, 8):
                pygame.draw.circle(self.pantalla, FONDO, (x + desplazamiento, y - 3), 3)
        for bala in self.balas:
            pygame.draw.rect(self.pantalla, (255, 235, 100), self.caja(bala, 6, 18), border_radius=3)
        if not self.fin and (self.invulnerable <= 0 or int(self.invulnerable * 10) % 2 == 0):
            x, y = round(self.nave.x), round(self.nave.y)
            pygame.draw.polygon(self.pantalla, CIAN, [
                (x, y - 24), (x + 22, y + 20), (x, y + 10), (x - 22, y + 20),
            ])
            pygame.draw.polygon(self.pantalla, BLANCO, [(x, y - 12), (x + 6, y + 7), (x - 6, y + 7)])
        for posicion, _, vida, color in self.particulas:
            pygame.draw.circle(self.pantalla, color, (int(posicion.x), int(posicion.y)), max(1, int(vida * 7)))
        pygame.draw.rect(self.pantalla, (14, 22, 46), (0, 0, ANCHO, 48))
        self.texto(f"Puntos: {self.puntos}", (110, 25))
        self.texto(f"Oleada: {self.nivel}", (ANCHO // 2, 25))
        self.texto(f"Vidas: {self.vidas}", (ANCHO - 95, 25), color=CIAN)
        self.texto("Flechas: mover   |   Espacio: disparar   |   Esc: salir", (ANCHO // 2, ALTO - 16))
        if self.fin:
            velo = pygame.Surface((ANCHO, ALTO), pygame.SRCALPHA)
            velo.fill((3, 6, 20, 210))
            self.pantalla.blit(velo, (0, 0))
            self.texto("FIN DE PARTIDA", (ANCHO // 2, 270), grande=True)
            self.texto(f"Puntuación: {self.puntos}", (ANCHO // 2, 345), color=CIAN)
            self.texto("Enter o R para volver a jugar", (ANCHO // 2, 405))
            self.texto("Esc para salir", (ANCHO // 2, 445))
        pygame.display.flip()

    def ejecutar(self):
        activo = True
        while activo:
            dt = min(self.reloj.tick(60) / 1000, 0.05)
            for evento in pygame.event.get():
                if evento.type == pygame.QUIT:
                    activo = False
                elif evento.type == pygame.KEYDOWN:
                    if evento.key == pygame.K_ESCAPE:
                        activo = False
                    elif self.fin and evento.key in (pygame.K_RETURN, pygame.K_r):
                        self.reiniciar()
            if activo:
                self.actualizar(dt)
                self.dibujar()


if __name__ == "__main__":
    try:
        Juego().ejecutar()
    finally:
        pygame.quit()
