-- Supabase DDL Schema for SportConnect MVP (SEM SUPABASE AUTH)

-- Enable UUID extension se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE perfil_usuario AS ENUM ('organizador', 'capitao', 'atleta', 'juiz');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE status_inscricao AS ENUM ('pendente', 'aprovado', 'rejeitado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE status_partida AS ENUM ('agendada', 'em_andamento', 'encerrada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Tabela: usuarios (AGORA POSSUI SENHA E NÃO REFERENCIA AUTH.USERS)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    senha VARCHAR NOT NULL, -- Senha salva diretamente para MVP sem Auth
    tipo_perfil perfil_usuario NOT NULL DEFAULT 'atleta',
    modalidade_principal VARCHAR,
    foto_perfil VARCHAR,
    expo_push_token VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela: torneios
CREATE TABLE IF NOT EXISTS public.torneios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    modalidade VARCHAR NOT NULL,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    numero_max_times INT NOT NULL CHECK (numero_max_times > 0),
    valor_inscricao NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    local VARCHAR NOT NULL,
    capa_url VARCHAR,
    descricao TEXT,
    categoria_genero VARCHAR,
    hora_inicio VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela: times
CREATE TABLE IF NOT EXISTS public.times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    capitao_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome VARCHAR NOT NULL,
    categoria VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela: inscricoes
CREATE TABLE IF NOT EXISTS public.inscricoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    time_id UUID NOT NULL REFERENCES public.times(id) ON DELETE CASCADE,
    torneio_id UUID NOT NULL REFERENCES public.torneios(id) ON DELETE CASCADE,
    comprovante_pix_url VARCHAR,
    status status_inscricao NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(time_id, torneio_id)
);

-- 6. Tabela: partidas
CREATE TABLE IF NOT EXISTS public.partidas (
    id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    torneio_id UUID REFERENCES public.torneios(id) ON DELETE CASCADE,
    time_a_id UUID REFERENCES public.times(id) ON DELETE SET NULL,
    time_b_id UUID REFERENCES public.times(id) ON DELETE SET NULL,
    placar_a INT NOT NULL DEFAULT 0,
    placar_b INT NOT NULL DEFAULT 0,
    sets_a INT NOT NULL DEFAULT 0,
    sets_b INT NOT NULL DEFAULT 0,
    status status_partida NOT NULL DEFAULT 'agendada',
    proxima_partida_id VARCHAR REFERENCES public.partidas(id) ON DELETE SET NULL,
    fase_torneio VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Funções e Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_torneios_updated_at BEFORE UPDATE ON public.torneios FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_times_updated_at BEFORE UPDATE ON public.times FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_inscricoes_updated_at BEFORE UPDATE ON public.inscricoes FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_partidas_updated_at BEFORE UPDATE ON public.partidas FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 8. Tabela: quadras
CREATE TABLE IF NOT EXISTS public.quadras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR NOT NULL,
    localizacao VARCHAR NOT NULL,
    valor_hora NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabela: reservas
CREATE TABLE IF NOT EXISTS public.reservas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quadra_id UUID NOT NULL REFERENCES public.quadras(id) ON DELETE CASCADE,
    time_id UUID REFERENCES public.times(id) ON DELETE CASCADE,
    data_reserva TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_horas INT NOT NULL DEFAULT 1,
    valor_total NUMERIC(10, 2) NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TRIGGER update_quadras_updated_at BEFORE UPDATE ON public.quadras FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TRIGGER update_reservas_updated_at BEFORE UPDATE ON public.reservas FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 10. RLS (Row Level Security) 
-- ATENÇÃO: Como não estamos usando Supabase Auth, criamos políticas permissivas
-- para que o React Native consiga ler e gravar dados livremente.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torneios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quadras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Acesso total usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Acesso total torneios" ON public.torneios FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Acesso total times" ON public.times FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Acesso total inscricoes" ON public.inscricoes FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Acesso total partidas" ON public.partidas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Acesso total quadras" ON public.quadras FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================
-- GARANTIA DE COLUNAS (Para atualizar tabelas antigas)
-- ==========================================
ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS capa_url VARCHAR;
ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS categoria_genero VARCHAR;
ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS hora_inicio VARCHAR;

ALTER TABLE public.times ADD COLUMN IF NOT EXISTS capitao_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.times ADD COLUMN IF NOT EXISTS categoria VARCHAR;
ALTER TABLE public.times ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'CONFIRMED';
ALTER TABLE public.times ADD COLUMN IF NOT EXISTS player1 VARCHAR;
ALTER TABLE public.times ADD COLUMN IF NOT EXISTS player2 VARCHAR;

ALTER TABLE public.inscricoes ADD COLUMN IF NOT EXISTS comprovante_pix_url VARCHAR;

ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS sets_a INTEGER DEFAULT 0;
ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS sets_b INTEGER DEFAULT 0;


