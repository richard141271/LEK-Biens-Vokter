begin;

update apiaries
set apiary_number = regexp_replace(apiary_number, '^START-', 'OS-', 1, 1, 'i')
where apiary_number ~* '^START-';

notify pgrst, 'reload config';

commit;
