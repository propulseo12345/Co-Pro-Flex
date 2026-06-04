-- 0011_profiles_memberships_invitations.sql (01 §1.8-1.10)
-- Source : .planning/db-cible/01-copros-lots-personnes.md §1.8-1.10
-- profiles.cabinet_id (rattachement gestionnaire). FK coproprietaires.user_id -> profiles ajoutee ici.
-- copro_invitations = pivot cablage portail (R15/R16). Trigger handle_new_user.

create table public.profiles (
  id          uuid        not null references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  avatar_url  text,
  cabinet_id  uuid        references public.cabinets(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint pk_profiles primary key (id)
);
create index idx_profiles_email on public.profiles (email);
create index idx_profiles_cabinet on public.profiles (cabinet_id) where cabinet_id is not null;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- FK retroactive coproprietaires.user_id -> profiles (table profiles existe maintenant)
alter table public.coproprietaires
  add constraint fk_coproprietaires_user foreign key (user_id)
  references public.profiles(id) on delete set null;

-- handle_new_user : cree le profil a la creation d'un auth.users (AUTORISATION §3.2-B)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create table public.memberships (
  id         uuid            not null default gen_random_uuid(),
  user_id    uuid            not null references public.profiles(id) on delete cascade,
  copro_id   uuid            not null references public.copros(id) on delete cascade,
  role       membership_role not null default 'coproprietaire',
  created_at timestamptz     not null default now(),
  constraint pk_memberships primary key (id),
  constraint uq_membership_user_copro unique (user_id, copro_id)
);
create index idx_memberships_copro on public.memberships (copro_id);
create index idx_memberships_copro_role on public.memberships (copro_id, role);
create index idx_memberships_user on public.memberships (user_id);

create table public.copro_invitations (
  id                  uuid              not null default gen_random_uuid(),
  copro_id            uuid              not null references public.copros(id) on delete cascade,
  coproprietaire_id   uuid              not null references public.coproprietaires(id) on delete cascade,
  email               text              not null,
  token               text              not null default encode(gen_random_bytes(32),'hex'),
  status              invitation_status not null default 'pending',
  expires_at          timestamptz       not null default (now() + interval '14 days'),
  accepted_at         timestamptz,
  created_by          uuid              references public.profiles(id) on delete set null,
  created_at          timestamptz       not null default now(),
  constraint pk_copro_invitations primary key (id),
  constraint ck_inv_email check (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  constraint ck_inv_accepted check ((status = 'accepted') = (accepted_at is not null)),
  constraint uq_invitation_token unique (token)
);
create unique index uq_invitation_pending_coprop on public.copro_invitations (coproprietaire_id) where status = 'pending';
create index idx_inv_copro on public.copro_invitations (copro_id);
create index idx_inv_coprop on public.copro_invitations (coproprietaire_id);
create index idx_inv_token on public.copro_invitations (token);
create index idx_inv_pending on public.copro_invitations (copro_id, status) where status = 'pending';

create or replace function public.tr_invitation_copro_consistency()
returns trigger language plpgsql as $$
begin
  if (select copro_id from public.coproprietaires where id = new.coproprietaire_id) <> new.copro_id then
    raise exception 'invitation % : coproprietaire d''une autre copro', new.id using errcode='23514';
  end if;
  return new;
end;
$$;
create trigger trg_invitation_copro_consistency before insert or update on public.copro_invitations
  for each row execute function public.tr_invitation_copro_consistency();
revoke execute on function public.tr_invitation_copro_consistency() from public, anon, authenticated;
