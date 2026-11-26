-- Dos videos del catálogo fueron borrados de YouTube: se reemplazan.
update public.exercises set video_url = 'https://www.youtube.com/watch?v=fqsTgdTPRQU'
 where org_id is null and name = 'Press de banca' and video_url = 'https://www.youtube.com/watch?v=FMpwElqKC6Q';
update public.exercises set video_url = 'https://www.youtube.com/watch?v=2_MsoqTpIJ8'
 where org_id is null and name = 'Rotación rusa con balón' and video_url = 'https://www.youtube.com/watch?v=NSCbldIsXeI';
