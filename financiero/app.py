# Importación de módulos necesarios
from flask import Flask, request, jsonify, render_template  # Flask para crear la aplicación web
import sqlite3  # SQLite para gestionar la base de datos local

# Inicializa la aplicación Flask
app = Flask(__name__)

# Nombre del archivo de la base de datos SQLite
DATABASE = 'database.db'

# ----------------------------------------------------------------------
# FUNCIÓN: init_db()
# Propósito: Inicializar la base de datos y crear la tabla 'creditos' si no existe
# ----------------------------------------------------------------------
def init_db():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS creditos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,      -- Identificador único
                cliente TEXT NOT NULL,                     -- Nombre del cliente
                monto REAL NOT NULL,                       -- Monto del crédito otorgado
                tasa_interes REAL NOT NULL,                -- Tasa de interés aplicada
                plazo INTEGER NOT NULL,                    -- Plazo del crédito (en meses, años, etc.)
                fecha_otorgamiento TEXT NOT NULL           -- Fecha en la que se otorgó el crédito
            )
        ''')
    print("Base de datos inicializada.")

# ----------------------------------------------------------------------
# RUTA: /
# Método: GET
# Descripción: Muestra la página principal con el formulario HTML
# ----------------------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html')  # Debe existir el archivo templates/index.html

# ----------------------------------------------------------------------
# RUTA: /creditos
# Método: GET
# Descripción: Obtiene todos los créditos registrados en la base de datos
# ----------------------------------------------------------------------
@app.route('/creditos', methods=['GET'])
def listar_creditos():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM creditos")
        rows = cursor.fetchall()

        # Obtiene los nombres de las columnas (por ejemplo: id, cliente, monto...)
        columnas = []
        for col in cursor.description:
            columnas.append(col[0])

        # Construye una lista de diccionarios con los datos de cada fila
        data = []
        for row in rows:
            dic = {}
            for i in range(len(columnas)):
                dic[columnas[i]] = row[i]
            data.append(dic)

        # Devuelve los datos en formato JSON
        return jsonify(data)

# ----------------------------------------------------------------------
# RUTA: /creditos
# Método: POST
# Descripción: Registra un nuevo crédito a partir de los datos recibidos en formato JSON
# ----------------------------------------------------------------------
@app.route('/creditos', methods=['POST'])
def registrar_credito():
    data = request.json  # Obtiene el cuerpo del request como JSON
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO creditos (cliente, monto, tasa_interes, plazo, fecha_otorgamiento)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            data['cliente'],
            data['monto'],
            data['tasa_interes'],
            data['plazo'],
            data['fecha_otorgamiento']
        ))
        conn.commit()
        return jsonify({'mensaje': 'Crédito registrado correctamente'}), 201

# ----------------------------------------------------------------------
# RUTA: /creditos/<int:id>
# Método: PUT
# Descripción: Edita un crédito existente identificado por su ID
# ----------------------------------------------------------------------
@app.route('/creditos/<int:id>', methods=['PUT'])
def editar_credito(id):
    data = request.json  # Obtiene el JSON del request
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE creditos
            SET cliente = ?, monto = ?, tasa_interes = ?, plazo = ?, fecha_otorgamiento = ?
            WHERE id = ?
        ''', (
            data['cliente'],
            data['monto'],
            data['tasa_interes'],
            data['plazo'],
            data['fecha_otorgamiento'],
            id
        ))
        conn.commit()
        return jsonify({'mensaje': 'Crédito actualizado correctamente'})

# ----------------------------------------------------------------------
# RUTA: /creditos/<int:id>
# Método: DELETE
# Descripción: Elimina un crédito de la base de datos según su ID
# ----------------------------------------------------------------------
@app.route('/creditos/<int:id>', methods=['DELETE'])
def eliminar_credito(id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM creditos WHERE id = ?", (id,))
        conn.commit()
        return jsonify({'mensaje': 'Crédito eliminado correctamente'})

# ----------------------------------------------------------------------
# RUTA: /datos-grafico
# Método: GET
# Descripción: Devuelve datos agregados para graficar número de créditos por cliente
# ----------------------------------------------------------------------
@app.route('/datos-grafico')
def datos_grafico():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT cliente, COUNT(*) FROM creditos GROUP BY cliente
        ''')
        datos = cursor.fetchall()

    # Estructura la respuesta para Chart.js u otra librería de gráficos
    return jsonify({
        "clientes": [fila[0] for fila in datos],  # Lista con nombres de clientes
        "totales": [fila[1] for fila in datos]    # Lista con cantidad de créditos por cliente
    })

# ----------------------------------------------------------------------
# BLOQUE PRINCIPAL
# Descripción: Inicializa la base de datos y lanza la aplicación Flask
# ----------------------------------------------------------------------
if __name__ == '__main__':
    init_db()  # Crea la tabla si no existe
    app.run(debug=True)  # Ejecuta el servidor en modo desarrollo
