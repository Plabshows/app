
def generate_sql():
    categories = {
        'Roaming': '42f050db-aa72-4a8f-97ba-8521b4c1ec03',
        'Musician': '636d2dcd-3e1d-4b1e-b111-a6400ca1b025',
        'Dancer': 'bf451e54-4edb-4453-8ff7-f74a3882e89c',
        'Circus': '6e2eba1a-54ee-4360-95b1-932089633089',
        'DJ': 'bff4df18-b95f-4f7e-821b-ab303b030c9a',
        'Magic': 'f26b86db-2ef5-476b-bf53-3a09d4ecba17',
        'Fire & Flow': '95585a4e-1cc1-417e-a064-7f210b9c2996',
        'Specialty Act': '7dc05cb1-fa8a-4317-9c17-d2682831d73c',
        'Presenter': 'd2a26c3d-cae5-44be-b93d-69dff6d8413b',
        'Comedian': '0213d374-c4f2-48b7-bfe8-da15cfd79ed9',
        'Singer': '0ca60f4f-2c8b-421c-9711-88f1e9327cb8'
    }

    counts = {
        'Roaming': 15,
        'Musician': 10,
        'Dancer': 10,
        'Circus': 10,
        'DJ': 5,
        'Magic': 5,
        'Fire & Flow': 5,
        'Specialty Act': 5,
        'Presenter': 5,
        'Comedian': 5,
        'Singer': 5
    }

    owner_id = 'cbc605d5-518d-4fab-94e4-3d3cda8cf833'
    location = 'Dubai, UAE'

    sql_statements = []
    
    # Generic descriptors to vary names
    descriptors = {
        'Roaming': ['Elite', 'Interactive', 'LED', 'Mirror', 'Vintage', 'Futuristic', 'Neon', 'Golden', 'Chrome', 'Inflatable', 'Bespoke', 'Digital', 'Hybrid', 'Mystic', 'Urban'],
        'Musician': ['String', 'Electric', 'Acoustic', 'Fusion', 'Solo', 'Jazz', 'Classical', 'Contemporary', 'Rock', 'Pop'],
        'Dancer': ['Modern', 'Contemporary', 'Street', 'Ballet', 'Holographic', 'Tron', 'Glitch', 'Breakdance', 'Traditional', 'Fire'],
        'Circus': ['Aerial', 'Silk', 'Hoop', 'Trapeze', 'Contortion', 'Acrobatic', 'Equilibrist', 'Juggling', 'Cyr Wheel', 'Balance'],
        'DJ': ['Deep House', 'Techno', 'Hologram', 'Silent Disco', 'Vinyl'],
        'Magic': ['Digital', 'Mentalist', 'Close-up', 'Stage', 'Grand Illusion'],
        'Fire & Flow': ['Pixel Poi', 'Flame', 'Pyrotechnic', 'Flow', 'Spark'],
        'Specialty Act': ['Robot', 'Laser', 'Mirror', 'Statue', 'Projection'],
        'Presenter': ['Gala', 'Corporate', 'Hype', 'Moderator', 'Bilingual'],
        'Comedian': ['Tech', 'Improv', 'Satirical', 'Sketch', 'AI-assisted'],
        'Singer': ['Opera', 'Pop', 'Soul', 'Gospel', 'Jazz']
    }

    for cat_name, count in counts.items():
        cat_id = categories[cat_name]
        for i in range(count):
            desc_list = descriptors.get(cat_name, ['Professional'])
            desc = desc_list[i % len(desc_list)]
            name = f"{desc} {cat_name}"
            if count > len(desc_list):
                name += f" {i + 1}"
            
            # Simple description
            description = f"Professional {cat_name} available for corporate events, weddings, and private parties in Dubai."
            
            sql = f"INSERT INTO acts (name, category_id, owner_id, location_base, is_published, description) VALUES ('{name}', '{cat_id}', '{owner_id}', '{location}', false, '{description}');"
            sql_statements.append(sql)

    with open('insert_acts.sql', 'w') as f:
        f.write('\n'.join(sql_statements))

if __name__ == "__main__":
    generate_sql()
