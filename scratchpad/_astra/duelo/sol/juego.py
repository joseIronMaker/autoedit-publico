import math
import random
import sys

import pygame


ANCHO, ALTO = 800, 600
FPS = 60
NEGRO = (8, 10, 22)
BLANCO = (240, 245, 255)
AZUL = (65, 170, 255)
ROJO = (245, 75, 85)
AMARILLO = (255, 220, 80)
VERDE = (80, 225, 135)


class Nave(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((48, 38), pygame.SRCALPHA)
        pygame.draw.polygon(self.image, AZUL, [(24, 0), (47, 36), (31, 29), (24, 37), (17, 29), (1, 36)])
        pygame.draw.polygon(self.image, BLANCO, [(24, 7), (31, 25), (24, 21), (17, 25)])
        self.rect = self.image.get_rect(midbottom=(ANCHO // 2, ALTO - 25))
        self.velocidad = 330
        self.recarga = 0

    def update(self, dt):
        teclas = pygame.key.get_pressed()
        dx = teclas[pygame.K_RIGHT] - teclas[pygame.K_LEFT]
        dy = teclas[pygame.K_DOWN] - teclas[pygame.K_UP]
        if dx and dy:
            dx *= math.sqrt(0.5)
            dy *= math.sqrt(0.5)
        self.rect.x += round(dx * self.velocidad * dt)
        self.rect.y += round(dy * self.velocidad * dt)
        self.rect.clamp_ip(pygame.Rect(8, ALTO // 2, ANCHO - 16, ALTO // 2 - 12))
        self.recarga = max(0, self.recarga - dt)

    def disparar(self):
        if self.recarga <= 0:
            self.recarga = 0.22
            return Bala(self.rect.centerx, self.rect.top)
        return None


class Bala(pygame.sprite.Sprite):
    def __init__(self, x, y):
        super().__init__()
        self.image = pygame.Surface((5, 17), pygame.SRCALPHA)
        pygame.draw.rect(self.image, AMARILLO, (0, 0, 5, 17), border_radius=2)
        self.rect = self.image.get_rect(midbottom=(x, y))
        self.y = float(self.rect.y)

    def update(self, dt):
        self.y -= 570 * dt
        self.rect.y = round(self.y)
        if self.rect.bottom < 0:
            self.kill()


class Enemigo(pygame.sprite.Sprite):
    def __init__(self, x, y, fila):
        super().__init__()
        self.image = pygame.Surface((42, 30), pygame.SRCALPHA)
        color = (235 - fila * 18, 75 + fila * 24, 105 + fila * 20)
        pygame.draw.rect(self.image, color, (5, 5, 32, 19), border_radius=7)
        pygame.draw.rect(self.image, color, (0, 12, 42, 8), border_radius=3)
        pygame.draw.circle(self.image, BLANCO, (15, 14), 3)
        pygame.draw.circle(self.image, BLANCO, (27, 14), 3)
        pygame.draw.line(self.image, color, (10, 24), (6, 29), 4)
        pygame.draw.line(self.image, color, (32, 24), (36, 29), 4)
        self.rect = self.image.get_rect(center=(x, y))


class Juego:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Defensa Galactica")
        self.pantalla = pygame.display.set_mode((ANCHO, ALTO))
        self.reloj = pygame.time.Clock()
        self.fuente = pygame.font.Font(None, 34)
        self.fuente_grande = pygame.font.Font(None, 72)
        self.estrellas = [(random.randrange(ANCHO), random.randrange(ALTO), random.choice((1, 1, 2))) for _ in range(100)]
        self.reiniciar()

    def reiniciar(self):
        self.nave = Nave()
        self.naves = pygame.sprite.GroupSingle(self.nave)
        self.balas = pygame.sprite.Group()
        self.enemigos = pygame.sprite.Group()
        self.puntuacion = 0
        self.vidas = 3
        self.nivel = 1
        self.direccion = 1
        self.velocidad_enemigos = 55
        self.invulnerable = 0
        self.fin = False
        self.crear_flota()

    def crear_flota(self):
        for fila in range(4):
            for columna in range(9):
                self.enemigos.add(Enemigo(112 + columna * 72, 80 + fila * 52, fila))

    def mover_enemigos(self, dt):
        desplazamiento = self.direccion * self.velocidad_enemigos * dt
        tocar_borde = any(
            enemigo.rect.right + desplazamiento >= ANCHO - 12
            or enemigo.rect.left + desplazamiento <= 12
            for enemigo in self.enemigos
        )
        if tocar_borde:
            self.direccion *= -1
            for enemigo in self.enemigos:
                enemigo.rect.y += 22
        else:
            for enemigo in self.enemigos:
                enemigo.rect.x += round(desplazamiento)

    def perder_vida(self):
        if self.invulnerable > 0:
            return
        self.vidas -= 1
        if self.vidas <= 0:
            self.fin = True
        else:
            self.nave.rect.midbottom = (ANCHO // 2, ALTO - 25)
            self.invulnerable = 1.6

    def actualizar(self, dt):
        if self.fin:
            return
        self.invulnerable = max(0, self.invulnerable - dt)
        self.naves.update(dt)
        self.balas.update(dt)
        self.mover_enemigos(dt)

        impactos = pygame.sprite.groupcollide(self.enemigos, self.balas, True, True)
        self.puntuacion += len(impactos) * 100

        if self.invulnerable <= 0 and pygame.sprite.spritecollide(self.nave, self.enemigos, True):
            self.perder_vida()

        invasores = [e for e in self.enemigos if e.rect.bottom >= ALTO - 18]
        if invasores:
            for enemigo in invasores:
                enemigo.kill()
            self.perder_vida()

        if not self.enemigos and not self.fin:
            self.nivel += 1
            self.velocidad_enemigos = min(175, 55 + (self.nivel - 1) * 18)
            self.crear_flota()

    def dibujar(self):
        self.pantalla.fill(NEGRO)
        for x, y, radio in self.estrellas:
            pygame.draw.circle(self.pantalla, (115, 125, 155), (x, y), radio)
        self.enemigos.draw(self.pantalla)
        self.balas.draw(self.pantalla)
        if self.invulnerable <= 0 or int(self.invulnerable * 10) % 2 == 0:
            self.naves.draw(self.pantalla)

        texto = self.fuente.render(f"Puntos: {self.puntuacion}    Vidas: {self.vidas}    Nivel: {self.nivel}", True, BLANCO)
        self.pantalla.blit(texto, (18, 16))

        if self.fin:
            velo = pygame.Surface((ANCHO, ALTO), pygame.SRCALPHA)
            velo.fill((0, 0, 0, 195))
            self.pantalla.blit(velo, (0, 0))
            titulo = self.fuente_grande.render("FIN DE PARTIDA", True, ROJO)
            puntos = self.fuente.render(f"Puntuacion final: {self.puntuacion}", True, BLANCO)
            ayuda = self.fuente.render("Pulsa ENTER para volver a jugar", True, VERDE)
            self.pantalla.blit(titulo, titulo.get_rect(center=(ANCHO // 2, 235)))
            self.pantalla.blit(puntos, puntos.get_rect(center=(ANCHO // 2, 315)))
            self.pantalla.blit(ayuda, ayuda.get_rect(center=(ANCHO // 2, 370)))
        pygame.display.flip()

    def ejecutar(self):
        while True:
            dt = min(self.reloj.tick(FPS) / 1000, 0.05)
            for evento in pygame.event.get():
                if evento.type == pygame.QUIT:
                    pygame.quit()
                    return
                if evento.type == pygame.KEYDOWN:
                    if evento.key == pygame.K_ESCAPE:
                        pygame.quit()
                        return
                    if evento.key == pygame.K_RETURN and self.fin:
                        self.reiniciar()

            if not self.fin and pygame.key.get_pressed()[pygame.K_SPACE]:
                bala = self.nave.disparar()
                if bala:
                    self.balas.add(bala)
            self.actualizar(dt)
            self.dibujar()


if __name__ == "__main__":
    Juego().ejecutar()
