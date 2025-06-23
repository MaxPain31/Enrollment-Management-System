def capitalize_words(name):
    if name:
        return " ".join(word.capitalize() for word in name.split())
    return name
