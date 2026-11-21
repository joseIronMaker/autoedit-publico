import os
import random

os.environ["SDL_VIDEO_WINDOW_POS"] = "2160,140"    # segundo monitor
import pygame

pygame.init()
pantalla = pygame.display.set_mode((640, 420))
pygame.display.set_caption("Mi primer juego")
reloj = pygame.time.Clock()
fuente = pygame.font.SysFont("dejavusans", 30)

pelota = [320, 210]
vel = [5, 4]
pala_y, marcador = 160, [0, 0]

for _ in range(45 * 60):   # 45 s: la escena mas larga del curso dura 16 y antes el juego
                          # se cerraba a los 11 y los ultimos segundos salian en negro
    for e in pygame.event.get():
        if e.type == pygame.QUIT:
            raise SystemExit
    pelota[0] += vel[0]
    pelota[1] += vel[1]
    if pelota[1] < 10 or pelota[1] > 410:
        vel[1] = -vel[1]
    if pelota[0] < 10 or pelota[0] > 630:
        vel[0] = -vel[0]
        marcador[0 if pelota[0] > 320 else 1] += 1
    pala_y += (pelota[1] - pala_y - 45) * 0.12

    pantalla.fill((18, 22, 26))
    pygame.draw.rect(pantalla, (215, 155, 78), (40, int(pala_y), 16, 90))
    pygame.draw.rect(pantalla, (127, 170, 196), (584, int(pala_y) + 20, 16, 90))
    pygame.draw.circle(pantalla, (240, 240, 235), (int(pelota[0]), int(pelota[1])), 10)
    texto = f"{marcador[0]}   -   {marcador[1]}"
    pantalla.blit(fuente.render(texto, True, (200, 205, 205)), (275, 20))
    pygame.display.flip()
    reloj.tick(60)
