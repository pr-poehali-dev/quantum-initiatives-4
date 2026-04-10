CREATE TABLE IF NOT EXISTS t_p94698650_quantum_initiatives_.users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    name VARCHAR(255),
    password_hash VARCHAR(255),
    session_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p94698650_quantum_initiatives_.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p94698650_quantum_initiatives_.users(id),
    title VARCHAR(255) NOT NULL DEFAULT 'Услуга прошивки',
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_id VARCHAR(255),
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p94698650_quantum_initiatives_.firmware_files (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES t_p94698650_quantum_initiatives_.orders(id),
    user_id INTEGER REFERENCES t_p94698650_quantum_initiatives_.users(id),
    file_type VARCHAR(20) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_url TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT NOW()
);
