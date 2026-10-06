import json
from collections import defaultdict
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score


def audit():
    data_dir = Path("data/processed")
    if not data_dir.is_dir():
        from ml.data.pipeline import run_pipeline
        run_pipeline()

    train_texts, train_labels = [], []
    val_texts, val_labels = [], []

    lengths_per_split_label = defaultdict(list)

    for split in ["train", "val", "test"]:
        file_path = data_dir / f"{split}.jsonl"
        with open(file_path, encoding="utf-8") as f:
            for line in f:
                if not line.strip(): continue
                record = json.loads(line)
                text = record["text"]
                label = record["label"]

                lengths_per_split_label[(split, label)].append(len(text))

                if split == "train":
                    train_texts.append(text)
                    train_labels.append(label)
                elif split == "val":
                    val_texts.append(text)
                    val_labels.append(label)

    print("=== Length Distribution ===")
    for (split, label), lengths in sorted(lengths_per_split_label.items()):
        print(f"{split.upper()} | Label {label}: Mean={np.mean(lengths):.1f}, Median={np.median(lengths):.1f}, Std={np.std(lengths):.1f}")

    print("\n=== Top 20 Char-Ngram TF-IDF Features ===")
    vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5), max_features=1000)
    X_train = vectorizer.fit_transform(train_texts)
    y_train = np.array(train_labels)

    feature_names = np.array(vectorizer.get_feature_names_out())
    for label in [0, 1]:
        class_docs = X_train[y_train == label]
        mean_tfidf = np.asarray(class_docs.mean(axis=0)).flatten()
        top_indices = mean_tfidf.argsort()[-20:][::-1]
        top_features = feature_names[top_indices]
        print(f"Class {label} Top 20: {', '.join(repr(f) for f in top_features)}")

    print("\n=== Tiny Classifiers (Validation Accuracy) ===")
    y_val = np.array(val_labels)

    # (a) text length
    clf_len = LogisticRegression()
    X_train_len = np.array([len(t) for t in train_texts]).reshape(-1, 1)
    X_val_len = np.array([len(t) for t in val_texts]).reshape(-1, 1)
    clf_len.fit(X_train_len, y_train)
    acc_len = accuracy_score(y_val, clf_len.predict(X_val_len))
    print(f"(a) Text Length Only: {acc_len:.2%}")

    # (b) last 40 chars
    vectorizer_last = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 4), max_features=500)
    X_train_last = vectorizer_last.fit_transform([t[-40:] for t in train_texts])
    X_val_last = vectorizer_last.transform([t[-40:] for t in val_texts])
    clf_last = LogisticRegression()
    clf_last.fit(X_train_last, y_train)
    acc_last = accuracy_score(y_val, clf_last.predict(X_val_last))
    print(f"(b) Last 40 Chars Only: {acc_last:.2%}")

    # (c) first 40 chars
    vectorizer_first = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 4), max_features=500)
    X_train_first = vectorizer_first.fit_transform([t[:40] for t in train_texts])
    X_val_first = vectorizer_first.transform([t[:40] for t in val_texts])
    clf_first = LogisticRegression()
    clf_first.fit(X_train_first, y_train)
    acc_first = accuracy_score(y_val, clf_first.predict(X_val_first))
    print(f"(c) First 40 Chars Only: {acc_first:.2%}")

if __name__ == "__main__":
    audit()
