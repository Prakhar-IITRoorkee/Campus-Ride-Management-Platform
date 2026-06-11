from PIL import Image

def remove_white_bg(input_path, output_path, tolerance=230):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # Check if the pixel is near white
        if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
            newData.append((255, 255, 255, 0)) # Fully transparent
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")
    print("Background removed and saved as " + output_path)

remove_white_bg("rickshaw.jpg", "rickshaw_transparent.png")
