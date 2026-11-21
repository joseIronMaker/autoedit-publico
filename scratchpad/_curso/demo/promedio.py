"""Promedio de una lista de notas."""


def promedio(notas):
    """Devuelve el promedio de las notas. Con la lista vacía devuelve 0.0."""
    if not notas:
        return 0.0
    return sum(notas) / len(notas)


if __name__ == "__main__":
    print(promedio([10, 8, 9]))   # 9.0
    print(promedio([6, 7]))       # 6.5
    print(promedio([]))           # 0.0
