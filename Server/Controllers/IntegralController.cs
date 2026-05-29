using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class IntegralController : ControllerBase
{
    private readonly IIntegralService _service;
    private readonly ILogger<IntegralController> _logger;

    public IntegralController(IIntegralService service, ILogger<IntegralController> logger)
    {
        _service = service;
        _logger  = logger;
    }

    /// <summary>
    /// Resuelve una integral indefinida y devuelve el resultado con el paso a paso.
    /// </summary>
    /// <remarks>
    /// Sintaxis de entrada (MathNet.Symbolics):
    ///   - Multiplicación: 3*x
    ///   - Potencia:       x^2
    ///   - Funciones:      sin(x), cos(x), tan(x), exp(x), log(x)   [log = ln]
    ///   - División:       1/x
    ///
    /// Ejemplos válidos: "x^2 + 3*x + 1", "sin(x)", "3*cos(x)", "exp(x) + 1/x"
    /// </remarks>
    [HttpPost("solve")]
    [ProducesResponseType(typeof(IntegralResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public ActionResult<IntegralResponse> Solve([FromBody] IntegralRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        _logger.LogInformation("POST /solve — expresión: {Expr}", request.Expression);
        IntegralResponse response = _service.Solve(request);
        return Ok(response);
    }

    /// <summary>
    /// Devuelve una lista de expresiones de ejemplo para probar la API.
    /// </summary>
    [HttpGet("examples")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<object>> GetExamples()
    {
        var examples = new[]
        {
            new { expression = "x^2 + 3*x + 5",       description = "Polinomio cuadrático"             },
            new { expression = "x^3 - 2*x^2 + x - 4", description = "Polinomio cúbico"                 },
            new { expression = "sin(x)",               description = "Función seno"                     },
            new { expression = "cos(x)",               description = "Función coseno"                   },
            new { expression = "tan(x)",               description = "Función tangente"                 },
            new { expression = "exp(x)",               description = "Función exponencial (eˣ)"         },
            new { expression = "log(x)",               description = "Logaritmo natural ln(x)"          },
            new { expression = "1/x",                  description = "Función 1/x → ln|x|"              },
            new { expression = "3*sin(x)",             description = "Múltiplo constante del seno"      },
            new { expression = "2*cos(x) + x^2",       description = "Suma: coseno más polinomio"       },
        };
        return Ok(examples);
    }
}
