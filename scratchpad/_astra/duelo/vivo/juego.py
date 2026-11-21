"""Invasores: flechas para moverse, espacio para disparar."""

import math
import random
import sys

import pygame


ANCHO, ALTO = 800, 700
FONDO = (8, 12, 30)
BLANCO = (235, 242, 255)
AZUL = (70, 210, 255)
ROJO = (255, 85, 110)


class Juego:
    def __init__(self):
        pygame.init()
        self.pantalla = pygame.display.set_mode((ANCHO, ALTO))
        pygame.display.set_caption("Invasores del espacio")
        self.reloj = pygame.time.Clock()
        self.fuente = pygame.font.Font(None, 30)
        self.grande = pygame.font.Font(None, 64)
        self.estrellas = [
            [random.randrange(ANCHO), random.randrange(ALTO), random.uniform(20, 85)]
            for _ in range(90)
        ]
        self.reiniciar()

    def reiniciar(self):
        self.nave = pygame.Vector2(ANCHO / 2, ALTO - 65)
        self.balas = []
        self.enemigos = []
        self.particulas = []
        self.puntos = 0
        self.vidas = 3
        self.nivel = 0
        self.recarga = 0.0
        self.invulnerable = 1.5
        self.terminado = False
        self.nueva_oleada()

    def nueva_oleada(self):
        self.nivel += 1
        self.balas.clear()
        self.enemigos = [
            pygame.Vector2(105 + columna * 82, 100 + fila * 55)
            for fila in range(min(3 + (self.nivel - 1) // 3, 5))
            for columna in range(8)
        ]
        self.direccion = 1

    @staticmethod
    def rectangulo(posicion, ancho, alto):
        return pygame.Rect(round(posicion.x - ancho / 2),
                           round(posicion.y - alto / 2), ancho, alto)

    def explosion(self, posicion, color):
        for _ in range(20):
            angulo = random.uniform(0, math.tau)
            rapidez = random.uniform(40, 180)
            self.particulas.append([
                posicion.copy(),
                pygame.Vector2(math.cos(angulo), math.sin(angulo)) * rapidez,
                random.uniform(0.25, 0.65), color,
            ])

    def actualizar(self, dt):
        for estrella in self.estrellas:
            estrella[1] = (estrella[1] + estrella[2] * dt) % ALTO
        for particula in self.particulas[:]:
            particula[0] += particula[1] * dt
            particula[2] -= dt
            if particula[2] <= 0:
                self.particulas.remove(particula)
        if self.terminado:
            return

        teclas = pygame.key.get_pressed()
        movimiento = pygame.Vector2(
            int(teclas[pygame.K_RIGHT]) - int(teclas[pygame.K_LEFT]),
            int(teclas[pygame.K_DOWN]) - int(teclas[pygame.K_UP]),
        )
        if movimiento.length_squared():
            self.nave += movimiento.normalize() * 340 * dt
        self.nave.x = max(24, min(ANCHO - 24, self.nave.x))
        self.nave.y = max(75, min(ALTO - 28, self.nave.y))
        self.recarga = max(0, self.recarga - dt)
        self.invulnerable = max(0, self.invulnerable - dt)
        if teclas[pygame.K_SPACE] and self.recarga <= 0:
            self.balas.append(self.nave + pygame.Vector2(0, -27))
            self.recarga = 0.18

        for bala in self.balas[:]:
            bala.y -= 590 * dt
            if bala.y < -15:
                self.balas.remove(bala)

        velocidad = min(45 + self.nivel * 12, 165)
        for enemigo in self.enemigos:
            enemigo.x += self.direccion * velocidad * dt
            enemigo.y += min(7 + self.nivel * 2, 35) * dt
        if self.enemigos:
            izquierda = min(e.x for e in self.enemigos)
            derecha = max(e.x for e in self.enemigos)
            correccion = 0
            if derecha > ANCHO - 30:
                correccion = ANCHO - 30 - derecha
                self.direccion = -1
            elif izquierda < 30:
                correccion = 30 - izquierda
                self.direccion = 1
            if correccion:
                for enemigo in self.enemigos:
                    enemigo.x += correccion
                    enemigo.y += 18

        for bala in self.balas[:]:
            for enemigo in self.enemigos[:]:
                if self.rectangulo(bala, 6, 18).colliderect(
                        self.rectangulo(enemigo, 40, 30)):
                    self.balas.remove(bala)
                    self.enemigos.remove(enemigo)
                    self.puntos += 10
                    self.explosion(enemigo, ROJO)
                    break

        tocado = False
        nave_rect = self.rectangulo(self.nave, 34, 38)
        for enemigo in self.enemigos[:]:
            colision = nave_rect.colliderect(self.rectangulo(enemigo, 40, 30))
            if enemigo.y >= ALTO - 15 or (colision and self.invulnerable <= 0):
                self.enemigos.remove(enemigo)
                self.explosion(enemigo, ROJO)
                tocado = True
        if tocado:
            self.vidas -= 1
            self.explosion(self.nave, AZUL)
            self.invulnerable = 2.0
            self.nave.update(ANCHO / 2, ALTO - 65)
            if self.vidas <= 0:
                self.terminado = True
        if not self.enemigos and not self.terminado:
            self.nueva_oleada()

    def texto(self, contenido, posicion, color=BLANCO, grande=False, centrado=False):
        superficie = (self.grande if grande else self.fuente).render(contenido, True, color)
        rect = superficie.get_rect()
        if centrado:
            rect.center = posicion
        else:
            rect.topleft = posicion
        self.pantalla.blit(superficie, rect)

    def dibujar(self):
        self.pantalla.fill(FONDO)
        for x, y, velocidad in self.estrellas:
            brillo = int(90 + velocidad)
            pygame.draw.circle(self.pantalla, (brillo, brillo, brillo), (int(x), int(y)), 1)
        for bala in self.balas:
            pygame.draw.rect(self.pantalla, AZUL, self.rectangulo(bala, 6, 18), border_radius=3)
        for enemigo in self.enemigos:
            x, y = round(enemigo.x), round(enemigo.y)
            pygame.draw.rect(self.pantalla, ROJO, (x - 20, y - 12, 40, 24), border_radius=7)
            pygame.draw.line(self.pantalla, ROJO, (x - 13, y - 10), (x - 20, y - 20), 3)
            pygame.draw.line(self.pantalla, ROJO, (x + 13, y - 10), (x + 20, y - 20), 3)
            for ojo in (-9, 9):
                pygame.draw.rect(self.pantalla, FONDO, (x + ojo - 3, y - 4, 6, 7))
        if not self.terminado and (self.invulnerable <= 0 or int(self.invulnerable * 10) % 2 == 0):
            x, y = round(self.nave.x), round(self.nave.y)
            pygame.draw.polygon(self.pantalla, AZUL,
                                [(x, y - 24), (x - 22, y + 20), (x, y + 10), (x + 22, y + 20)])
            pygame.draw.polygon(self.pantalla, BLANCO,
                                [(x, y - 12), (x - 6, y + 7), (x + 6, y + 7)])
        for posicion, _, vida, color in self.particulas:
            pygame.draw.circle(self.pantalla, color, (round(posicion.x), round(posicion.y)),
                               max(1, int(vida * 6)))
        pygame.draw.rect(self.pantalla, FONDO, (0, 0, ANCHO, 48))
        self.texto(f"Puntos: {self.puntos}", (18, 14))
        self.texto(f"Oleada: {self.nivel}", (340, 14))
        self.texto(f"Vidas: {self.vidas}", (675, 14), AZUL)
        if self.terminado:
            velo = pygame.Surface((ANCHO, ALTO), pygame.SRCALPHA)
            velo.fill((0, 0, 15, 205))
            self.pantalla.blit(velo, (0, 0))
            self.texto("FIN DE PARTIDA", (ANCHO // 2, 270), ROJO, True, True)
            self.texto(f"Puntuación: {self.puntos}", (ANCHO // 2, 345), centrado=True)
            self.texto("Enter para volver a jugar", (ANCHO // 2, 410), centrado=True)
            self.texto("Esc para salir", (ANCHO // 2, 450), centrado=True)
        else:
            self.texto("Flechas: mover   Espacio: disparar   Esc: salir",
                       (ANCHO // 2, ALTO - 14), (145, 160, 185), centrado=True)
        pygame.display.flip()

    def ejecutar(self):
        activo = True
        while activo:
            dt = min(self.reloj.tick(60) / 1000.0, 0.05)
            for evento in pygame.event.get():
                if evento.type == pygame.QUIT:
                    activo = False
                elif evento.type == pygame.KEYDOWN:
                    if evento.key == pygame.K_ESCAPE:
                        activo = False
                    elif evento.key == pygame.K_RETURN and self.terminado:
                        self.reiniciar()
            if activo:
                self.actualizar(dt)
                self.dibujar()


if __name__ == "__main__":
    try:
        Juego().ejecutar()
    finally:
        pygame.quit()
    sys.exit(0)
