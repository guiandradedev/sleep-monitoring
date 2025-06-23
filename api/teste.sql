-- CREATE TABLE data (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     sample INT NOT NULL,
--     timestamp BIGINT NOT NULL,
--     type ENUM('microphone', 'temperature', 'humidity', 'luminosity')
-- );

CREATE TABLE data (
    timestamp BIGINT PRIMARY KEY, -- Timestamp Unix em segundos
    -- datetime DATETIME,             -- Data e hora no formato padrão do MySQL
    humidity DOUBLE,                -- Valores decimais para umidade
    luminosity DOUBLE,              -- Valores decimais para luminosidade
    temperature DOUBLE              -- Valores decimais para temperatura
);