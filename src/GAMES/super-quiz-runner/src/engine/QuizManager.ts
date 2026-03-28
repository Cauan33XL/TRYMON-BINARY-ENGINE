export interface Question {
    q: string;
    o: { A: string, B: string, C: string, D: string };
    c: string;
}

export class QuizManager {
    questions: Question[];
    used: number[];
    current: Question | null;

    constructor(){
        this.questions = [
            { q: "Qual o maior planeta do Sistema Solar?", o:{A:"Júpiter",B:"Saturno",C:"Terra",D:"Marte"}, c:"A" },
            { q: "Em que ano o homem pisou na Lua?", o:{A:"1972",B:"1969",C:"1965",D:"1975"}, c:"B" },
            { q: "Qual é a fórmula da água?", o:{A:"H2O", B:"CO2", C:"NaCl", D:"O2"}, c:"A" },
            { q: "Qual destes é um mamífero?", o:{A:"Pinguim", B:"Baleia", C:"Crocodilo", D:"Águia"}, c:"B" },
            { q: "Qual a capital do Brasil?", o:{A:"Rio de Janeiro", B:"Brasília", C:"São Paulo", D:"Belo Horizonte"}, c:"B" },
            { q: "Quantos lados tem um hexágono?", o:{A:"5", B:"6", C:"7", D:"8"}, c:"B" },
            { q: "Qual é o elemento químico representado por 'O'?", o:{A:"Ouro", B:"Oxigênio", C:"Ósmio", D:"Oganésson"}, c:"B" },
            { q: "Quem pintou a Mona Lisa?", o:{A:"Van Gogh", B:"Picasso", C:"Leonardo da Vinci", D:"Michelangelo"}, c:"C" },
            { q: "Qual é o maior oceano da Terra?", o:{A:"Atlântico", B:"Índico", C:"Ártico", D:"Pacífico"}, c:"D" },
            { q: "Quantos planetas existem no Sistema Solar?", o:{A:"7", B:"8", C:"9", D:"10"}, c:"B" }
        ];
        this.used = [];
        this.current = null;
    }
    getNew(): Question {
        if(this.used.length === this.questions.length) this.used = [];
        let idx: number;
        do { idx = Math.floor(Math.random()*this.questions.length); } while(this.used.includes(idx));
        this.used.push(idx);
        this.current = this.questions[idx];
        return this.current;
    }
}
