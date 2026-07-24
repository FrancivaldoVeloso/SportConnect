ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS categoria_genero VARCHAR;

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR;

ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS sets_a INT NOT NULL DEFAULT 0;
ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS sets_b INT NOT NULL DEFAULT 0;

ALTER TABLE public.partidas ALTER COLUMN torneio_id DROP NOT NULL;

-- Remove constraint temporariamente para alterar o tipo da coluna
ALTER TABLE public.partidas DROP CONSTRAINT IF EXISTS partidas_proxima_partida_id_fkey;

-- Altera as colunas para VARCHAR
ALTER TABLE public.partidas ALTER COLUMN id TYPE VARCHAR USING id::text;
ALTER TABLE public.partidas ALTER COLUMN proxima_partida_id TYPE VARCHAR USING proxima_partida_id::text;

-- Restaura a constraint
ALTER TABLE public.partidas ADD CONSTRAINT partidas_proxima_partida_id_fkey FOREIGN KEY (proxima_partida_id) REFERENCES public.partidas(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
