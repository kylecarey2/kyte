use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tantivy::schema::Value;
use tantivy::{
    collector::TopDocs,
    doc,
    query::QueryParser,
    schema::{
        Field, IndexRecordOption, Schema, TextFieldIndexing, TextOptions, FAST, STORED, STRING,
    },
    Index, IndexReader, IndexWriter, TantivyDocument, TantivyError,
};

use tantivy::tokenizer::{LowerCaser, SimpleTokenizer, TextAnalyzer};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NoteDoc {
    pub id: String,
    pub title: String,
    pub body: String,
    pub path: String,
    pub modified: i64,
}

pub struct SearchState {
    index: Index,
    writer: Mutex<IndexWriter>,
    reader: IndexReader,
    fields: NoteFields,
}

struct NoteFields {
    id: Field,
    title: Field,
    body: Field,
    path: Field,
    modified: Field,
}

impl SearchState {
    pub fn open(index_dir: PathBuf) -> Result<Self, TantivyError> {
        let mut schema_builder = Schema::builder();

        // Use filepath (name) as id
        let id = schema_builder.add_text_field("id", STRING | STORED);

        // Indexing options for autocomplete tokenizer
        let text_indexing = TextFieldIndexing::default()
            .set_tokenizer("autocomplete")
            .set_index_option(IndexRecordOption::WithFreqsAndPositions);

        let text_options = TextOptions::default()
            .set_indexing_options(text_indexing.clone())
            .set_stored();

        let title = schema_builder.add_text_field("title", text_options);

        // Use autocomplete tokenizer for body field
        let body_options = TextOptions::default().set_indexing_options(text_indexing);
        let body = schema_builder.add_text_field("body", body_options);

        let path = schema_builder.add_text_field("path", STORED);
        let modified = schema_builder.add_i64_field("modified", FAST | STORED);

        let schema = schema_builder.build();

        let index = if index_dir.exists() {
            Index::open_in_dir(&index_dir)?
        } else {
            std::fs::create_dir_all(&index_dir)?;
            Index::create_in_dir(&index_dir, schema.clone())?
        };

        // Autocomplete(esque) tokenizer
        let autocomplete_analyzer = TextAnalyzer::builder(SimpleTokenizer::default())
            .filter(LowerCaser)
            .build();
        index
            .tokenizers()
            .register("autocomplete", autocomplete_analyzer);

        let writer = index.writer(50_000_000)?; // 50mb
        let reader = index.reader_builder().try_into()?;

        Ok(Self {
            index,
            writer: Mutex::new(writer),
            reader,
            fields: NoteFields {
                id,
                title,
                body,
                path,
                modified,
            },
        })
    }

    pub fn add_or_update(&self, note: &NoteDoc) -> Result<(), TantivyError> {
        let mut writer = self.writer.lock().unwrap();
        let term = tantivy::Term::from_field_text(self.fields.id, &note.id);
        writer.delete_term(term);

        // Index the note
        writer.add_document(doc!(
            self.fields.id => note.id.clone(),
            self.fields.title => note.title.clone(),
            self.fields.body => note.body.clone(),
            self.fields.path => note.path.clone(),
            self.fields.modified => note.modified,
        ))?;

        writer.commit()?;
        Ok(())
    }

    pub fn remove(&self, note_id: &str) -> Result<(), TantivyError> {
        let mut writer = self.writer.lock().unwrap();
        let term = tantivy::Term::from_field_text(self.fields.id, note_id);
        writer.delete_term(term);
        writer.commit()?;
        Ok(())
    }

    // Adds a wildcard to the last term in the query string, unless it ends with a space or is empty
    fn prepare_query(query_str: &str) -> String {
        if query_str.ends_with('*') || query_str.contains('"') {
            return query_str.to_string();
        } else if query_str.contains(':') {
            let mut parts: Vec<String> = query_str.split(':').map(String::from).collect();

            if parts.len() == 2 {
                parts[1] = format!("/{}.*/", parts[1]);
                return parts.join(":");
            }
        }

        // Don't wildcard last term if ends with space
        if query_str.ends_with(' ') {
            return query_str.trim_end().to_string();
        }

        let trimmed = query_str.trim().to_lowercase(); // convert to lowercase (needed for autocomplete)
        if trimmed.is_empty() {
            return String::new();
        }

        // Split into terms, modify last term, then join
        let mut terms: Vec<String> = trimmed.split_whitespace().map(String::from).collect();

        if let Some(last) = terms.last_mut() {
            *last = format!("body:/{}.*/", last);
        }

        terms.push("~".to_string());

        terms.join(" ")
    }

    pub fn search(&self, query_str: &str, limit: usize) -> Result<Vec<NoteDoc>, TantivyError> {
        let searcher = self.reader.searcher();

        // Parse query with wildcard on last term, require all terms to match
        let mut query_parser =
            QueryParser::for_index(&self.index, vec![self.fields.title, self.fields.body]);
        query_parser.set_conjunction_by_default();
        query_parser.allow_regexes();

        // Get prepared query string
        let prepared = Self::prepare_query(query_str);
        if prepared.is_empty() {
            return Ok(Vec::new());
        }

        let query = query_parser.parse_query(&prepared)?;
        let top_docs = TopDocs::with_limit(limit).order_by_score();
        let docs = searcher.search(&query, &top_docs)?; // search for documents

        let mut results = Vec::new();
        for (_score, doc_address) in docs {
            let doc: TantivyDocument = searcher.doc(doc_address)?;
            results.push(self.doc_to_note(&doc));
        }
        Ok(results)
    }

    pub fn clear_and_rebuild<F>(
        &self,
        notes: Vec<NoteDoc>,
        mut progress: F,
    ) -> Result<(), TantivyError>
    where
        F: FnMut(usize, usize),
    {
        let mut writer = self.writer.lock().unwrap();
        writer.delete_all_documents()?; // delete all documents

        // Add each note to index
        let total = notes.len();
        for (i, note) in notes.iter().enumerate() {
            writer.add_document(doc!(
                self.fields.id => note.id.clone(),
                self.fields.title => note.title.clone(),
                self.fields.body => note.body.clone(),
                self.fields.path => note.path.clone(),
                self.fields.modified => note.modified,
            ))?;
            progress(i + 1, total);
        }

        writer.commit()?;
        Ok(())
    }

    fn doc_to_note(&self, doc: &TantivyDocument) -> NoteDoc {
        let get_text = |field: Field| -> String {
            doc.get_first(field)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string()
        };
        let get_i64 =
            |field: Field| -> i64 { doc.get_first(field).and_then(|v| v.as_i64()).unwrap_or(0) };

        NoteDoc {
            id: get_text(self.fields.id),
            title: get_text(self.fields.title),
            body: String::new(), // empty body, for now
            path: get_text(self.fields.path),
            modified: get_i64(self.fields.modified),
        }
    }
}

pub type SearchHandle = Arc<Mutex<SearchState>>;

pub fn parse_note_file(full_path: &Path, base_dir: &Path) -> Option<NoteDoc> {
    if full_path.extension()?.to_str()? != "md" {
        return None;
    }

    let content = std::fs::read_to_string(full_path).ok()?;

    // Get path
    let rel_path = full_path
        .strip_prefix(base_dir)
        .ok()?
        .to_string_lossy()
        .replace("\\", "/");

    // Get title based on first line that starts with #
    let title = content
        .lines()
        .find(|l| l.trim_start().starts_with("# "))
        .map(|l| l.trim_start().trim_start_matches("# ").trim().to_string())
        .unwrap_or_else(|| {
            full_path
                .file_stem()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_default()
        });

    // Skip first line (often title)
    let body = content
        .lines()
        .skip(1)
        .map(|l| l.trim().to_string())
        .collect::<Vec<_>>()
        .join("\n");

    // Get modified timestamp
    let modified = full_path
        .metadata()
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    Some(NoteDoc {
        id: rel_path.clone(),
        title,
        body: body,
        path: rel_path,
        modified,
    })
}
