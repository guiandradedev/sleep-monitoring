CREATE TABLE data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sample INT NOT NULL,
    timestamp BIGINT NOT NULL,
    type ENUM('microphone', 'temperature', 'humidity', 'luminosity')
);
