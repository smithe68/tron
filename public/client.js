const BOARD_SIZE = 64;

////// CLASSES //////

const Direction = {
    None: 0,
    Left: 1,
    Right: 2,
    Up: 3,
    Down: 4,
};

class Color {
    static Black = new Color(0, 0, 0, 255);
    static Blue = new Color(0, 255, 255, 255);
    static Red = new Color(255, 165, 0, 255);

    /**
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} a 
     */
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    /**
     * @param {Color} other 
     */
    compare(other) {
        return this.r == other.r &&
            this.g == other.g &&
            this.b == other.b &&
            this.a == other.a;
    }
}

class Player {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {Color} color
     */
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.direction = Direction.None;
        this.color = color;
        this.score = 0;
    }

    /** @returns {boolean} */
    isOutOfBounds() {
        return this.x >= BOARD_SIZE || this.x < 0 ||
            this.y < 0 || this.y >= BOARD_SIZE;
    }

    /**
     * 
     * @param {number} dt 
     * @param {async () => {}} oncollide 
     */
    update(dt, oncollide) {
        const speed = 20 * dt;

        const x0 = Math.floor(this.x);
        const y0 = Math.floor(this.y);

        const {
            x: dx,
            y: dy
        } = getDirectionVector(this.direction);

        const pixelAhead = Board.Active.getPixel(x0 + dx, y0 + dy);
        const isTrail = !pixelAhead.compare(Color.Black);
        const isMoving = this.direction !== Direction.None;

        if ((isMoving && isTrail) || this.isOutOfBounds()) {
            oncollide();
        }

        if (this.direction !== Direction.None) {
            this.x += dx * speed;
            this.y += dy * speed;
        }
    }

    draw() {
        Board.Active.setPixel(this.x, this.y, this.color);
    }

    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} dir
     */
    reset(x, y, dir) {
        this.x = x;
        this.y = y;
        this.direction = dir;
    }
}

class Board {
    static Active = new Board(BOARD_SIZE, BOARD_SIZE);

    /**
     * @param {number} width 
     * @param {number} height 
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.buffer = new ImageData(width, height);
    }

    /** @param {CanvasRenderingContext2D} ctx */
    async render(ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(await createImageBitmap(this.buffer), 0, 0,
            canvas.clientWidth, canvas.clientHeight);
    }

    clear() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.setPixel(x, y, Color.Black);
            }
        }
    }

    /**
     * @private
     * @param {number} x 
     * @param {number} y 
     * @returns {boolean}
     */
    getIndex(x, y) {
        return (y * this.width + x) * 4;
    }

    /**
     * @private
     * @param {number} x 
     * @param {number} y
     * @returns {boolean} 
     */
    inBounds(x, y) {
        return x >= 0 && x < this.width &&
            y >= 0 && y < this.height
    }

    /**
     * @param {number} x0
     * @param {number} y0 
     * @param {Color} color 
     */
    setPixel(x0, y0, color) {
        const x = Math.floor(x0);
        const y = Math.floor(y0);

        if (this.inBounds(x, y)) {
            const index = this.getIndex(x, y);
            this.buffer.data[index] = color.r;
            this.buffer.data[index + 1] = color.g;
            this.buffer.data[index + 2] = color.b;
            this.buffer.data[index + 3] = color.a;
        }
    }

    /**
     * @param {number} x0 
     * @param {number} y0 
     * @param {Color} color 
     */
    getPixel(x0, y0) {
        const x = Math.floor(x0);
        const y = Math.floor(y0);

        if (this.inBounds(x, y)) {
            const index = this.getIndex(x, y);
            return new Color(
                this.buffer.data[index],
                this.buffer.data[index + 1],
                this.buffer.data[index + 2],
                this.buffer.data[index + 3]
            );
        } else {
            return Color.Black;
        }
    }
}

////// THE JUICE //////

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;
let gameEnd = false;

const player1 = new Player(1, 1, Color.Blue);
const player2 = new Player(BOARD_SIZE - 2, BOARD_SIZE - 2, Color.Red);

const findMatchBtn = document.getElementById('find-match-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const statusText = document.getElementById('status');

/** @param {number} direction */
function getDirectionVector(direction) {
    let x = 0;
    let y = 0;

    switch (direction) {
        case Direction.Left:
            x -= 1;
            break;
        case Direction.Right:
            x += 1;
            break;
        case Direction.Up:
            y -= 1;
            break;
        case Direction.Down:
            y += 1;
            break;
    }

    return {
        x,
        y
    };
}

function resetPlayers() {
    player1.reset(1, 1, Direction.Right);
    player2.reset(BOARD_SIZE - 2, BOARD_SIZE - 2,
        Direction.Left);
}

function onPlayerCollide(index) {
    gameEnd = true;
    const won = document.getElementById('won');
    won.innerText = index == 0 ? "Player 2 Won!" : "Player 1 Won!";
    won.hidden = false;

    if (index == 0) player2.score += 1;
    else player1.score += 1;

    statusText.innerText = `${player1.score} - TRON - ${player2.score}`;

    setTimeout(() => {
        gameEnd = false;
        won.hidden = true;
        resetPlayers();
        Board.Active.clear();
    }, 2000);
}

async function render(time) {
    await Board.Active.render(ctx);
    const dt = (time - lastTime) * 0.001;
    lastTime = time;

    if (!gameEnd) {
        player1.update(dt, () => onPlayerCollide(0));
        player2.update(dt, () => onPlayerCollide(1));

        player1.draw();
        player2.draw();
    }

    requestAnimationFrame(async (time) => await render(time));
}

////// MAIN //////

(async () => {
    Board.Active.clear();
    requestAnimationFrame(async (time) => await render(time));
})();

////// BUTTONS //////

const PORT = 8080;
const socket = io.connect(`http://localhost:${PORT}`);

function disconnect() {
    window.location.reload();
}

function findMatch() {
    socket.emit('find_match');
    findMatchBtn.hidden = true;
}

////// NETWORKING //////

let playerNum = 0;
let match = -1;

socket.on('match_found', (data) => {
    console.log('match_found called');
    disconnectBtn.hidden = false;
    match = data.match;
    playerNum = data.playerNum;

    const won = document.getElementById('won');
    won.innerText = `You are ${playerNum == 1 ? "Cyan" : "Orange"}`;
    won.hidden = false;

    setTimeout(() => {
        won.hidden = true;
        player1.direction = Direction.Right;
        player2.direction = Direction.Left;
    }, 2000);
});

socket.on('update', (data) => {
    if (data.playerNum == 1) {
        player1.direction = data.direction;
    } else{
        player2.direction = data.direction;
    }
});

socket.on('player_left', () => {
    disconnect();
});

////// EVENTS //////

addEventListener('keydown', (event) => {
    let key = event.key;
    let direction = -1;

    switch (key) {
        case 'w':
            direction = Direction.Up;
            break;
        case 'a':
            direction = Direction.Left;
            break;
        case 's':
            direction = Direction.Down;
            break;
        case 'd':
            direction = Direction.Right;
            break;
    }
    
    socket.emit('update_direction',{
        direction,
        match,
        playerNum
    });
});