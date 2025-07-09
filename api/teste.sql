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
    night_id INT,          -- ID da noite associada
);

DELIMITER //

CREATE TRIGGER before_insert_data
BEFORE INSERT ON data
FOR EACH ROW
BEGIN
    DECLARE last_timestamp_found BIGINT;
    DECLARE last_night_id_found INT;

    SELECT timestamp, night_id
    INTO last_timestamp_found, last_night_id_found
    FROM data
    ORDER BY timestamp DESC
    LIMIT 1;

    -- 300 = 60 * 5 (5 minutos em segundos)
    IF last_timestamp_found IS NOT NULL AND (NEW.timestamp - last_timestamp_found >= 300) THEN
        SET NEW.night_id = last_night_id_found + 1;
    ELSE
        SET NEW.night_id = 1;
    END IF;

END;
//

DELIMITER ;
