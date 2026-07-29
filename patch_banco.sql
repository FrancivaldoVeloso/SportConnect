ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.torneios ADD COLUMN IF NOT EXISTS categoria_genero VARCHAR;

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR;

ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS sets_a INT NOT NULL DEFAULT 0;
ALTER TABLE public.partidas ADD COLUMN IF NOT EXISTS sets_b INT NOT NULL DEFAULT 0;

ALTER TABLE public.partidas ALTER COLUMN torneio_id DROP NOT NULL;

-- Remove constraint temporariamente para alterar o tipo da coluna
ALTER TABLE public.partidas DROP CONSTRAINT IF EXISTS partidas_proxima_partida_id_fkey;

-- Altera as colunas para VARCHAR
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

ALTER TABLE public.times ADD COLUMN IF NOT EXISTS jogadores_extras JSONB DEFAULT '[]'::jsonb;

-- Criar bucket de storage para as capas dos torneios caso não exista
INSERT INTO storage.buckets (id, name, public) VALUES ('capas_torneios', 'capas_torneios', true) ON CONFLICT (id) DO NOTHING;

-- Garantir que as imagens sejam lidas por qualquer um
CREATE POLICY "Imagens das capas publicas" ON storage.objects FOR SELECT USING (bucket_id = 'capas_torneios');

-- Permitir que organizadores insiram capas
CREATE POLICY "Organizadores podem inserir capas" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'capas_torneios' AND auth.role() = 'authenticated');
