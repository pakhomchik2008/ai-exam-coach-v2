-- AI Exam Coach — catalog reachability + content fill (run NINTH, after 01-08).
--
-- Block 2, item 3. The gap report (scripts/catalog-gaps.mjs) showed that most
-- "missing subjects" were not missing content at all — they were two bugs that
-- made existing rows unreachable. Those are fixed first, because they cost
-- nothing and unlock far more than new authoring does.
--
--   Part 1  GCSE rows were tagged board='AQA'. curriculum-store's _boardMatches
--           treats a board-tagged row as invisible to every OTHER board, so the
--           3 of 4 GCSE students on Edexcel/OCR/WJEC saw an EMPTY catalog for
--           every subject. A-Level's 17 rows are all board=null (wildcard); GCSE
--           was the odd one out.
--   Part 2  Native-language pickers vs English row names: the Abitur picker
--           offers "Biologie" while the row is called "Biology" and lists no such
--           alias. 15 subjects across abitur/matura/ib were unreachable this way
--           despite full topic lists already sitting in the table.
--   Part 3  Three rows had a single "topic" whose name is a leftover fragment
--           of generation prose ("Topics", "For each:", "Same structure as
--           English:") — not corrupt data, the REAL skill-area list had been
--           left one level too deep, in that fragment's subtopics. Repaired by
--           promoting the list to real topics, matching how every sibling
--           language row in this table already models Reading/Listening/
--           Writing/Speaking/Grammar as top-level topics. matura "Język
--           angielski" is a PICKER PRESET, so that one was two clicks from the
--           dropdown into a course with one meaningless item.
--   Part 4  GCSE Computer Science — new, from the AQA 8525 specification.
--   Part 5  Abitur Mathematik — the row had 3 topics and no Stochastik at all,
--           one of the three mandatory Sachgebiete.
--
-- Sources for the authored content (Part 4/5):
--   AQA GCSE Computer Science 8525, subject content 3.1-3.8
--     https://www.aqa.org.uk/subjects/computer-science-and-it/gcse/computer-science-8525/specification/subject-content
--   KMK, Bildungsstandards im Fach Mathematik für die Allgemeine Hochschulreife
--   (Beschluss vom 18.10.2012), §2.2 Die mathematischen Leitideen L1-L5
--     https://www.kmk.org/fileadmin/Dateien/veroeffentlichungen_beschluesse/2012/2012_10_18-Bildungsstandards-Mathe-Abi.pdf
--
-- Topic NAMES and their module grouping are taken from those sources verbatim.
-- difficulty/importance are editorial pacing hints for the scheduler, not spec
-- content. Subtopics appear only where the source itself enumerates them; the
-- KMK standards do not subdivide below the Leitideen bullets, so the Abitur
-- topics carry none rather than invented ones.

begin;

-- ─── Part 1: GCSE board tagging ──────────────────────────────────────────────
-- Wildcard, matching A-Level. The unique index keys on
-- (qualification, board, spec, subject), so this moves 'AQA' -> '' in the key;
-- there are no board=null GCSE rows to collide with.
update public.curriculum set board = null
 where qualification_id = 'gcse' and board = 'AQA';

-- ─── Part 2: native-language aliases ─────────────────────────────────────────
-- Appends without dropping what is already there, and is re-runnable.
create or replace function pg_temp.add_aliases(p_qual text, p_subject text, p_new jsonb)
returns void language sql as $fn$
  update public.curriculum
     set aliases = coalesce((
           select jsonb_agg(distinct a) from jsonb_array_elements_text(
             (case when jsonb_typeof(aliases) = 'array' then aliases else '[]'::jsonb end) || p_new
           ) a), '[]'::jsonb)
   where qualification_id = p_qual and subject = p_subject;
$fn$;

select pg_temp.add_aliases('abitur', 'English', '["Englisch"]'::jsonb);
select pg_temp.add_aliases('abitur', 'Biology', '["Biologie"]'::jsonb);
select pg_temp.add_aliases('abitur', 'Chemistry', '["Chemie"]'::jsonb);
select pg_temp.add_aliases('abitur', 'Physics', '["Physik"]'::jsonb);
select pg_temp.add_aliases('abitur', 'History', '["Geschichte"]'::jsonb);
select pg_temp.add_aliases('abitur', 'Geography', '["Geographie","Erdkunde"]'::jsonb);
select pg_temp.add_aliases('abitur', 'Economics / Politics', '["Wirtschaft","Sozialkunde","Politik","Gemeinschaftskunde"]'::jsonb);
select pg_temp.add_aliases('matura', 'Biology', '["Biologia"]'::jsonb);
select pg_temp.add_aliases('matura', 'Chemistry', '["Chemia"]'::jsonb);
select pg_temp.add_aliases('matura', 'Physics', '["Fizyka"]'::jsonb);
select pg_temp.add_aliases('matura', 'History', '["Historia"]'::jsonb);
select pg_temp.add_aliases('matura', 'Geography', '["Geografia"]'::jsonb);
select pg_temp.add_aliases('matura', 'Civics (WOS)', '["Wiedza o społeczeństwie","WOS"]'::jsonb);
select pg_temp.add_aliases('ib', 'Mathematics: Analysis and Approaches (AA)', '["Mathematics AA","Maths AA","Math AA"]'::jsonb);
select pg_temp.add_aliases('ib', 'Mathematics: Applications and Interpretation (AI)', '["Mathematics AI","Maths AI","Math AI"]'::jsonb);

-- ─── Part 3: promote the buried skill-area list back to real topics ─────────
-- WHERE clause requires the OLD broken shape (jsonb_array_length <= 1), so this
-- is a no-op if the row has already been fixed by hand or by a re-run.
update public.curriculum set topics = '[{"name":"Reading Comprehension","module":null,"difficulty":5,"importance":7,"subtopics":["Gist and main idea","Specific information","Matching","Gap filling","Inference"]},{"name":"Listening Comprehension","module":null,"difficulty":5,"importance":7,"subtopics":["Gist and main idea","Specific information","Matching","Multiple choice","Note completion"]},{"name":"Language in Use","module":null,"difficulty":6,"importance":7,"subtopics":["Grammar structures","Word formation","Vocabulary in context","Gap filling","Sentence transformation"]},{"name":"Writing","module":null,"difficulty":5,"importance":6,"subtopics":["Formal letter/email","Informal letter/email","Argumentative essay","Narrative","Opinion essay"]},{"name":"Speaking","module":null,"difficulty":6,"importance":5,"subtopics":["Picture description","Roleplay","Extended monologue","Discussion"]},{"name":"Topic/Theme Areas","module":null,"difficulty":4,"importance":6,"subtopics":["Education","Work","Family","Health","Technology","Environment","Culture","Science","Travel","Society"]}]'::jsonb
 where source = 'official' and jsonb_array_length(topics) <= 1
   and qualification_id = 'matura' and subject = 'English Language';

update public.curriculum set topics = '[{"name":"Reading Comprehension","module":null,"difficulty":5,"importance":7,"subtopics":[]},{"name":"Listening Comprehension","module":null,"difficulty":5,"importance":7,"subtopics":[]},{"name":"Writing","module":null,"difficulty":5,"importance":6,"subtopics":[]},{"name":"Speaking","module":null,"difficulty":6,"importance":5,"subtopics":[]},{"name":"Grammar","module":null,"difficulty":6,"importance":7,"subtopics":[]},{"name":"Vocabulary","module":null,"difficulty":4,"importance":6,"subtopics":[]}]'::jsonb
 where source = 'official' and jsonb_array_length(topics) <= 1
   and qualification_id = 'matura' and subject = 'Foreign Languages';

update public.curriculum set topics = '[{"name":"Reading Comprehension","module":null,"difficulty":5,"importance":6,"subtopics":[]},{"name":"Listening Comprehension","module":null,"difficulty":5,"importance":6,"subtopics":[]},{"name":"Writing","module":null,"difficulty":5,"importance":6,"subtopics":[]},{"name":"Speaking","module":null,"difficulty":6,"importance":5,"subtopics":[]},{"name":"Grammar","module":null,"difficulty":6,"importance":6,"subtopics":[]},{"name":"Vocabulary","module":null,"difficulty":4,"importance":6,"subtopics":[]},{"name":"Literature","module":null,"difficulty":6,"importance":5,"subtopics":[]},{"name":"Cultural Studies","module":null,"difficulty":5,"importance":5,"subtopics":[]}]'::jsonb
 where source = 'official' and jsonb_array_length(topics) <= 1
   and qualification_id = 'abitur' and subject = 'Foreign Languages';

-- ─── Part 4: GCSE Computer Science (AQA 8525) ────────────────────────────────
-- board=null so it is visible on every board, consistent with Part 1.
delete from public.curriculum where qualification_id = 'gcse' and lower(subject) = 'computer science';
insert into public.curriculum
  (country_id, education_system_id, qualification_id, board, spec_version, subject, aliases, topics, source)
values (
  'gb', 'k12', 'gcse', null, '2024', 'Computer Science',
  '["GCSE Computer Science","Computer Science","Computing","Comp Sci","CS","Computer Studies"]'::jsonb,
  '[{"name":"Representing algorithms","module":"Fundamentals of algorithms","difficulty":4,"importance":7,"subtopics":["Algorithm","Decomposition","Abstraction","Pseudo-code","Program code","Flowcharts","Inputs, processing and outputs"]},{"name":"Efficiency of algorithms","module":"Fundamentals of algorithms","difficulty":5,"importance":6,"subtopics":["Comparing algorithms that solve the same problem","Algorithm efficiency"]},{"name":"Searching algorithms","module":"Fundamentals of algorithms","difficulty":5,"importance":7,"subtopics":["Linear search","Binary search","Comparing linear and binary search"]},{"name":"Sorting algorithms","module":"Fundamentals of algorithms","difficulty":6,"importance":7,"subtopics":["Merge sort","Bubble sort","Comparing merge sort and bubble sort"]},{"name":"Data types","module":"Programming","difficulty":3,"importance":7,"subtopics":[]},{"name":"Programming concepts","module":"Programming","difficulty":4,"importance":8,"subtopics":[]},{"name":"Arithmetic operations in a programming language","module":"Programming","difficulty":3,"importance":6,"subtopics":[]},{"name":"Relational operations in a programming language","module":"Programming","difficulty":3,"importance":6,"subtopics":[]},{"name":"Boolean operations in a programming language","module":"Programming","difficulty":4,"importance":6,"subtopics":[]},{"name":"Data structures","module":"Programming","difficulty":5,"importance":7,"subtopics":[]},{"name":"Input/output","module":"Programming","difficulty":3,"importance":6,"subtopics":[]},{"name":"String handling operations in a programming language","module":"Programming","difficulty":5,"importance":6,"subtopics":[]},{"name":"Random number generation in a programming language","module":"Programming","difficulty":3,"importance":5,"subtopics":[]},{"name":"Structured programming and subroutines (procedures and functions)","module":"Programming","difficulty":6,"importance":7,"subtopics":[]},{"name":"Robust and secure programming","module":"Programming","difficulty":6,"importance":6,"subtopics":[]},{"name":"Number bases","module":"Fundamentals of data representation","difficulty":3,"importance":7,"subtopics":[]},{"name":"Converting between number bases","module":"Fundamentals of data representation","difficulty":5,"importance":7,"subtopics":[]},{"name":"Units of information","module":"Fundamentals of data representation","difficulty":3,"importance":6,"subtopics":[]},{"name":"Binary arithmetic","module":"Fundamentals of data representation","difficulty":6,"importance":6,"subtopics":[]},{"name":"Character encoding","module":"Fundamentals of data representation","difficulty":4,"importance":6,"subtopics":[]},{"name":"Representing images","module":"Fundamentals of data representation","difficulty":5,"importance":6,"subtopics":[]},{"name":"Representing sound","module":"Fundamentals of data representation","difficulty":5,"importance":6,"subtopics":[]},{"name":"Data compression","module":"Fundamentals of data representation","difficulty":5,"importance":6,"subtopics":[]},{"name":"Hardware and software","module":"Computer systems","difficulty":2,"importance":6,"subtopics":["Hardware","Software"]},{"name":"Boolean logic","module":"Computer systems","difficulty":5,"importance":7,"subtopics":["NOT gate","AND gate","OR gate","XOR gate","Truth tables","Logic circuit diagrams","Boolean expressions"]},{"name":"Software classification","module":"Computer systems","difficulty":3,"importance":6,"subtopics":["System software","Application software","Operating systems (OS)","Utility programs"]},{"name":"Classification of programming languages and translators","module":"Computer systems","difficulty":4,"importance":6,"subtopics":["Low-level language","High-level language","Machine code","Assembly language","Interpreter","Compiler","Assembler"]},{"name":"Systems architecture","module":"Computer systems","difficulty":6,"importance":7,"subtopics":["Arithmetic logic unit","Control unit","Clock","Register","Bus","Clock speed","Processor cores","Cache size","Fetch-Execute cycle","RAM","ROM","Cache","Main memory","Secondary storage","Solid state storage","Magnetic storage","Cloud storage","Embedded system"]},{"name":"Computer networks and their advantages and disadvantages","module":"Fundamentals of computer networks","difficulty":3,"importance":6,"subtopics":[]},{"name":"Network types: PAN, LAN and WAN","module":"Fundamentals of computer networks","difficulty":3,"importance":6,"subtopics":["Personal Area Network (PAN)","Local Area Network (LAN)","Wide Area Network (WAN)"]},{"name":"Wired and wireless networks","module":"Fundamentals of computer networks","difficulty":4,"importance":6,"subtopics":[]},{"name":"Network protocols","module":"Fundamentals of computer networks","difficulty":5,"importance":7,"subtopics":["TCP","IP","HTTP","HTTPS","SMTP","IMAP"]},{"name":"Network security methods","module":"Fundamentals of computer networks","difficulty":5,"importance":6,"subtopics":["Authentication","Encryption","Firewalls","MAC address filtering"]},{"name":"The four-layer TCP/IP model","module":"Fundamentals of computer networks","difficulty":6,"importance":6,"subtopics":["Application layer","Transport layer","Internet layer","Link layer"]},{"name":"Fundamentals of cyber security","module":"Cyber security","difficulty":3,"importance":6,"subtopics":[]},{"name":"Social engineering","module":"Cyber security","difficulty":4,"importance":6,"subtopics":[]},{"name":"Malicious code (malware)","module":"Cyber security","difficulty":4,"importance":6,"subtopics":[]},{"name":"Methods to detect and prevent cyber security threats","module":"Cyber security","difficulty":5,"importance":6,"subtopics":[]},{"name":"Relational databases","module":"Relational databases and SQL","difficulty":5,"importance":6,"subtopics":[]},{"name":"Structured query language (SQL)","module":"Relational databases and SQL","difficulty":6,"importance":6,"subtopics":[]},{"name":"Impacts of digital technology on wider society, including issues of privacy","module":"Ethical, legal and environmental impacts","difficulty":3,"importance":6,"subtopics":[]}]'::jsonb,
  'official'
);

-- ─── Part 5: Abitur Mathematik (KMK Bildungsstandards) ───────────────────────
-- Replaces a 3-topic stub (Functions | Calculus | Analytic Geometry). Stochastik
-- was absent entirely, so a German student following this app would have
-- prepared for two of the three mandatory Sachgebiete and walked into the third
-- cold. Topic names are the KMK Leitideen bullets, grouped by the Sachgebiete
-- the document names (Analysis, Lineare Algebra/Analytische Geometrie, Stochastik).
update public.curriculum
   set topics = '[{"name":"Funktionsklassen der Sekundarstufe I nutzen","module":"Analysis","difficulty":3,"importance":7,"subtopics":[]},{"name":"Verknüpfung und Verkettung von Funktionen","module":"Analysis","difficulty":5,"importance":6,"subtopics":[]},{"name":"Grenzwerte und propädeutischer Grenzwertbegriff","module":"Analysis","difficulty":5,"importance":6,"subtopics":[]},{"name":"Sekanten- und Tangentensteigungen an Funktionsgraphen","module":"Analysis","difficulty":4,"importance":7,"subtopics":[]},{"name":"Die Ableitung als lokale Änderungsrate deuten","module":"Analysis","difficulty":4,"importance":8,"subtopics":[]},{"name":"Änderungsraten funktional beschreiben (Ableitungsfunktion)","module":"Analysis","difficulty":5,"importance":7,"subtopics":[]},{"name":"Ableitungsregeln: Faktor- und Summenregel","module":"Analysis","difficulty":4,"importance":8,"subtopics":[]},{"name":"Produktregel","module":"Analysis","difficulty":5,"importance":7,"subtopics":[]},{"name":"Kettenregel (erhöhtes Anforderungsniveau)","module":"Analysis","difficulty":6,"importance":6,"subtopics":[]},{"name":"Die Ableitung als lineare Approximation deuten (erhöhtes Anforderungsniveau)","module":"Analysis","difficulty":7,"importance":5,"subtopics":[]},{"name":"Monotonie und Extrema mithilfe der Ableitung bestimmen","module":"Analysis","difficulty":5,"importance":8,"subtopics":[]},{"name":"Ableitungsgraphen aus Funktionsgraphen entwickeln","module":"Analysis","difficulty":5,"importance":7,"subtopics":[]},{"name":"Änderungsraten berechnen und deuten","module":"Analysis","difficulty":5,"importance":7,"subtopics":[]},{"name":"Das bestimmte Integral als (re-)konstruierten Bestand deuten","module":"Analysis","difficulty":6,"importance":7,"subtopics":[]},{"name":"Hauptsatz der Differential- und Integralrechnung","module":"Analysis","difficulty":6,"importance":8,"subtopics":[]},{"name":"Funktionen mittels Stammfunktionen integrieren","module":"Analysis","difficulty":6,"importance":8,"subtopics":[]},{"name":"Inhalte von Flächen, die durch Funktionsgraphen begrenzt sind","module":"Analysis","difficulty":6,"importance":7,"subtopics":[]},{"name":"Bestände aus Änderungsraten und Anfangsbestand berechnen","module":"Analysis","difficulty":6,"importance":6,"subtopics":[]},{"name":"Volumen von Rotationskörpern (erhöhtes Anforderungsniveau)","module":"Analysis","difficulty":7,"importance":5,"subtopics":[]},{"name":"Natürliche Logarithmusfunktion und e-Funktion (erhöhtes Anforderungsniveau)","module":"Analysis","difficulty":6,"importance":6,"subtopics":[]},{"name":"Geeignete Verfahren zur Lösung von Gleichungen und Gleichungssystemen auswählen","module":"Analytische Geometrie / Lineare Algebra","difficulty":4,"importance":7,"subtopics":[]},{"name":"Algorithmisches Lösungsverfahren für lineare Gleichungssysteme","module":"Analytische Geometrie / Lineare Algebra","difficulty":5,"importance":7,"subtopics":[]},{"name":"Geometrische Sachverhalte in Ebene und Raum koordinatisieren","module":"Analytische Geometrie / Lineare Algebra","difficulty":4,"importance":7,"subtopics":[]},{"name":"Vektoren: elementare Operationen und Kollinearität","module":"Analytische Geometrie / Lineare Algebra","difficulty":4,"importance":7,"subtopics":[]},{"name":"Das Skalarprodukt geometrisch deuten","module":"Analytische Geometrie / Lineare Algebra","difficulty":5,"importance":7,"subtopics":[]},{"name":"Streckenlängen und Winkelgrößen im Raum mithilfe des Skalarprodukts","module":"Analytische Geometrie / Lineare Algebra","difficulty":5,"importance":7,"subtopics":[]},{"name":"Geraden und Ebenen analytisch beschreiben (Alternative A2)","module":"Analytische Geometrie / Lineare Algebra","difficulty":6,"importance":7,"subtopics":[]},{"name":"Lagebeziehungen von Geraden untersuchen (Alternative A2)","module":"Analytische Geometrie / Lineare Algebra","difficulty":6,"importance":6,"subtopics":[]},{"name":"Lagebeziehungen von Geraden und Ebenen (erhöhtes Anforderungsniveau, A2)","module":"Analytische Geometrie / Lineare Algebra","difficulty":7,"importance":6,"subtopics":[]},{"name":"Abstände zwischen Punkten, Geraden und Ebenen (erhöhtes Anforderungsniveau, A2)","module":"Analytische Geometrie / Lineare Algebra","difficulty":7,"importance":6,"subtopics":[]},{"name":"Sachverhalte mit Tupeln oder Matrizen beschreiben (Alternative A1)","module":"Analytische Geometrie / Lineare Algebra","difficulty":5,"importance":5,"subtopics":[]},{"name":"Matrizenmultiplikation und inverse Matrizen (Alternative A1)","module":"Analytische Geometrie / Lineare Algebra","difficulty":6,"importance":5,"subtopics":[]},{"name":"Potenzen von Matrizen bei mehrstufigen Prozessen (erhöhtes Anforderungsniveau, A1)","module":"Analytische Geometrie / Lineare Algebra","difficulty":7,"importance":4,"subtopics":[]},{"name":"Grenzmatrizen und Fixvektoren (erhöhtes Anforderungsniveau, A1)","module":"Analytische Geometrie / Lineare Algebra","difficulty":7,"importance":4,"subtopics":[]},{"name":"Statistische Erhebungen planen und beurteilen","module":"Stochastik","difficulty":3,"importance":6,"subtopics":[]},{"name":"Lage- und Streumaße einer Stichprobe bestimmen und deuten","module":"Stochastik","difficulty":4,"importance":6,"subtopics":[]},{"name":"Baumdiagramme und Vierfeldertafeln","module":"Stochastik","difficulty":4,"importance":7,"subtopics":[]},{"name":"Bedingte Wahrscheinlichkeiten","module":"Stochastik","difficulty":5,"importance":8,"subtopics":[]},{"name":"Stochastische Unabhängigkeit untersuchen","module":"Stochastik","difficulty":5,"importance":7,"subtopics":[]},{"name":"Zufallsgrößen und Wahrscheinlichkeitsverteilungen","module":"Stochastik","difficulty":5,"importance":8,"subtopics":[]},{"name":"Erwartungswert und Standardabweichung diskreter Zufallsgrößen","module":"Stochastik","difficulty":5,"importance":8,"subtopics":[]},{"name":"Die Binomialverteilung und ihre Kenngrößen","module":"Stochastik","difficulty":6,"importance":9,"subtopics":[]},{"name":"Simulationen zur Untersuchung stochastischer Situationen","module":"Stochastik","difficulty":5,"importance":5,"subtopics":[]},{"name":"In einfachen Fällen aufgrund von Stichproben auf die Gesamtheit schließen","module":"Stochastik","difficulty":6,"importance":7,"subtopics":[]},{"name":"Schätzen von Wahrscheinlichkeiten bei binomialverteilten Zufallsgrößen (erhöhtes Anforderungsniveau, B1)","module":"Stochastik","difficulty":7,"importance":6,"subtopics":[]},{"name":"Hypothesentests interpretieren und begründen (erhöhtes Anforderungsniveau, B2)","module":"Stochastik","difficulty":7,"importance":6,"subtopics":[]},{"name":"Diskrete und stetige Zufallsgrößen, Normalverteilung (erhöhtes Anforderungsniveau)","module":"Stochastik","difficulty":7,"importance":6,"subtopics":[]}]'::jsonb,
       aliases = '["Mathematics","Mathematik","Mathe","Math","Maths","Математика","матем","Analysis","Stochastik","Analytische Geometrie","Lineare Algebra"]'::jsonb
 where qualification_id = 'abitur' and subject = 'Mathematics (Mathematik)';

commit;

-- ─── verify ──────────────────────────────────────────────────────────────────
-- select qualification_id, board, subject, jsonb_array_length(topics) as topics
--   from public.curriculum where qualification_id in ('gcse','abitur') order by 1,3;
--
-- Then re-run the reachability report from the repo:
--   node scripts/catalog-gaps.mjs
